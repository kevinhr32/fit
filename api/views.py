from datetime import date, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework import mixins, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import User
from gimnasio.models import (
    Cliente,
    Clase,
    DIAS_PARA_POR_VENCER,
    Gimnasio,
    LogroObtenido,
    Pago,
    ParticipacionReto,
    PlanMembresia,
    Progreso,
    Reserva,
    Reto,
)
from gimnasio.logros import revisar_completar_reto, revisar_logros_asistencia, revisar_logros_progreso
from gimnasio.utils import formatear_pesos
from rutinas.models import Ejercicio, Rutina

from .permissions import IsAdmin, IsAdminOrEntrenador, IsCliente, IsClienteActivo, IsEntrenador
from .throttles import LoginRateThrottle
from .serializers import (
    ClienteSerializer,
    ClaseSerializer,
    EjercicioSerializer,
    EntrenadorSerializer,
    GimnasioSerializer,
    LogroObtenidoSerializer,
    MyTokenObtainPairSerializer,
    PagoSerializer,
    ParticipacionRetoSerializer,
    PlanMembresiaSerializer,
    ProgresoSerializer,
    ReservaSerializer,
    RetoSerializer,
    RutinaSerializer,
)


def _get_user_gimnasio(user):
    """Obtener el gimnasio asociado al usuario (ADMIN, ENTRENADOR o CLIENTE)."""
    if user.role == 'ADMIN':
        return getattr(user, 'gimnasio_admin', None)
    if user.role == 'ENTRENADOR':
        return user.gimnasio
    if user.role == 'CLIENTE':
        cliente = getattr(user, 'cliente_perfil', None)
        return cliente.gimnasio if cliente else None
    return None


class MyTokenObtainPairView(TokenObtainPairView):
    """Login vía JWT con claims adicionales."""
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]


class LogoutAPIView(APIView):
    """Logout: blacklista el refresh token para invalidarlo."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token inválido o ya invalidado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class DashboardAPIView(APIView):
    """Resumen de estadísticas del gimnasio."""
    permission_classes = [IsAdminOrEntrenador]

    def get(self, request):
        gimnasio = _get_user_gimnasio(request.user)
        if not gimnasio:
            return Response(
                {'detail': 'No tienes un gimnasio asignado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clientes = list(gimnasio.clientes.all())
        vencidos = sum(1 for c in clientes if c.estado == 'VENCIDO')
        por_vencer = sum(1 for c in clientes if c.estado == 'POR_VENCER')
        activos = sum(1 for c in clientes if c.estado == 'ACTIVO')

        alertas = [c for c in clientes if c.estado in ('VENCIDO', 'POR_VENCER')]
        alertas.sort(key=lambda c: c.fecha_vencimiento)

        return Response({
            'gimnasio': GimnasioSerializer(gimnasio).data,
            'total_clientes': len(clientes),
            'total_vencidos': vencidos,
            'total_por_vencer': por_vencer,
            'total_activos': activos,
            'alertas': ClienteSerializer(alertas, many=True).data,
        })


class GimnasioViewSet(viewsets.ViewSet):
    """Ver/editar el gimnasio propio del usuario."""
    permission_classes = [IsAdminOrEntrenador]

    def _get_gimnasio(self, user):
        gimnasio = _get_user_gimnasio(user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        return gimnasio

    def retrieve(self, request):
        gimnasio = self._get_gimnasio(request.user)
        serializer = GimnasioSerializer(gimnasio)
        return Response(serializer.data)

    def update(self, request):
        gimnasio = self._get_gimnasio(request.user)
        if request.user.role != 'ADMIN' or gimnasio.owner != request.user:
            raise PermissionDenied('No tienes permisos para editar este gimnasio.')

        serializer = GimnasioSerializer(gimnasio, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request):
        gimnasio = self._get_gimnasio(request.user)
        if request.user.role != 'ADMIN' or gimnasio.owner != request.user:
            raise PermissionDenied('No tienes permisos para editar este gimnasio.')

        serializer = GimnasioSerializer(gimnasio, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClienteViewSet(viewsets.ModelViewSet):
    """CRUD de clientes del gimnasio."""
    serializer_class = ClienteSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAdminOrEntrenador()]
        return [IsAdmin()]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return Cliente.objects.none()
        return Cliente.objects.filter(gimnasio=gimnasio)

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        serializer.save(gimnasio=gimnasio)

    @action(detail=True, methods=['post'], url_path='renovar')
    def renovar(self, request, pk=None):
        """Renovar la membresía de un cliente extendiendo su fecha de vencimiento.

        Solo permitido si al cliente le quedan DIAS_PARA_POR_VENCER días o menos
        (incluye membresías ya vencidas) y con una duración ('dias') que coincida
        con uno de los planes de membresía activos configurados por el gimnasio.
        """
        cliente = self.get_object()
        dias_restantes = (cliente.fecha_vencimiento - date.today()).days
        if dias_restantes > DIAS_PARA_POR_VENCER:
            return Response(
                {
                    'detail': (
                        f'Todavía faltan {dias_restantes} días para el vencimiento; '
                        f'solo se puede renovar con {DIAS_PARA_POR_VENCER} días o '
                        'menos de anticipación.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        dias = request.data.get('dias')
        try:
            dias = int(dias)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'El campo "dias" debe ser un número entero válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gimnasio = _get_user_gimnasio(request.user)
        planes_validos = list(
            PlanMembresia.objects.filter(gimnasio=gimnasio, activo=True)
            .values_list('dias', flat=True)
        )
        if dias not in planes_validos:
            return Response(
                {
                    'detail': (
                        f'"{dias}" no es un plan de membresía activo de tu gimnasio. '
                        f'Planes disponibles: {sorted(planes_validos)}.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        base = max(cliente.fecha_vencimiento, date.today())
        cliente.fecha_vencimiento = base + timedelta(days=dias)
        cliente.activo = True
        cliente.save()

        serializer = self.get_serializer(cliente)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlanMembresiaViewSet(viewsets.ModelViewSet):
    """CRUD de los planes de membresía (duraciones en días) que ofrece el gimnasio.

    Solo el ADMIN los administra. Se usan como opciones válidas al dar de alta o
    renovar un cliente (ver ClienteViewSet.renovar).
    """
    serializer_class = PlanMembresiaSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return PlanMembresia.objects.none()
        return PlanMembresia.objects.filter(gimnasio=gimnasio)

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        serializer.save(gimnasio=gimnasio)


class PagoPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class PagoViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Crear y listar pagos del gimnasio."""
    serializer_class = PagoSerializer
    pagination_class = PagoPagination

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAdminOrEntrenador()]
        return [IsAdmin()]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return Pago.objects.none()
        qs = Pago.objects.filter(cliente__gimnasio=gimnasio).select_related('cliente')
        cliente_id = self.request.query_params.get('cliente_id')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')

        cliente_id = self.request.data.get('cliente')
        try:
            cliente = Cliente.objects.get(id=cliente_id, gimnasio=gimnasio)
        except Cliente.DoesNotExist:
            raise NotFound('Cliente no encontrado en tu gimnasio.')

        serializer.save(cliente=cliente)


class EntrenadorViewSet(viewsets.ModelViewSet):
    """CRUD de entrenadores del gimnasio (solo ADMIN).

    El DELETE desasigna al entrenador del gimnasio en lugar de borrarlo.
    """
    serializer_class = EntrenadorSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return User.objects.none()
        return User.objects.filter(gimnasio=gimnasio, role='ENTRENADOR')

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        serializer.save(gimnasio=gimnasio)

    def perform_destroy(self, instance):
        instance.gimnasio = None
        instance.save()


class FinanzasAPIView(APIView):
    """Resumen financiero del gimnasio: KPIs, gráfico de barras y donut."""
    permission_classes = [IsAdmin]

    def get(self, request):
        gimnasio = _get_user_gimnasio(request.user)
        if not gimnasio:
            return Response(
                {'detail': 'No tienes un gimnasio asignado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pagos = Pago.objects.filter(cliente__gimnasio=gimnasio)
        hoy = date.today()
        inicio_mes = hoy.replace(day=1)

        # Total mes actual
        total_mes = pagos.filter(fecha_pago__gte=inicio_mes).aggregate(total=Sum('monto'))['total'] or 0

        # Total histórico
        total_historico = pagos.aggregate(total=Sum('monto'))['total'] or 0

        # Ingresos por mes (últimos 6 meses)
        ingresos_mensuales = []
        for i in range(5, -1, -1):
            mes_inicio = (hoy.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            mes_fin = (mes_inicio + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            total = pagos.filter(fecha_pago__gte=mes_inicio, fecha_pago__lte=mes_fin).aggregate(t=Sum('monto'))['t'] or 0
            ingresos_mensuales.append({
                'mes': mes_inicio.strftime('%b %Y'),
                'total': float(total),
            })

        # Por método de pago (donut)
        por_metodo = pagos.values('metodo_pago').annotate(total=Sum('monto')).order_by('-total')
        METODO_DISPLAY = dict(Pago.METODO_CHOICES)
        COLOR_MAP = {
            'EFECTIVO': '#10B981',
            'TRANSFERENCIA': '#3B82F6',
            'TARJETA': '#8B5CF6',
            'NEQUI_DAVIPLATA': '#EC4899',
            'BREB': '#F97316',
        }
        metodos_data = []
        cumulative = 0.0
        for m in por_metodo:
            pct = (float(m['total']) / float(total_historico) * 100) if total_historico else 0
            metodo_key = m['metodo_pago']
            metodos_data.append({
                'metodo': metodo_key,
                'metodo_display': METODO_DISPLAY.get(metodo_key, metodo_key),
                'total': float(m['total']),
                'porcentaje': round(pct, 1),
                'color': COLOR_MAP.get(metodo_key, '#6B7280'),
                'offset': round(cumulative, 1),
            })
            cumulative += pct

        # Últimos 10 pagos
        ultimos_pagos = pagos.select_related('cliente').order_by('-fecha_pago')[:10]

        # Máximo mensual para escalar el gráfico de barras
        max_mensual = max((m['total'] for m in ingresos_mensuales), default=0)

        # Años disponibles para el selector de exportación
        anio_actual = hoy.year
        rango_anios = list(range(anio_actual, anio_actual - 5, -1))

        return Response({
            'gimnasio': GimnasioSerializer(gimnasio).data,
            'total_mes': float(total_mes),
            'total_historico': float(total_historico),
            'ingresos_mensuales': ingresos_mensuales,
            'metodos_data': metodos_data,
            'ultimos_pagos': PagoSerializer(ultimos_pagos, many=True).data,
            'max_mensual': float(max_mensual),
            'anio_actual': anio_actual,
            'mes_actual': hoy.month,
            'rango_anios': rango_anios,
        })


_MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]


class ExportarPagosPDFAPIView(APIView):
    """Exportar reporte de pagos a PDF (mes específico o año completo)."""
    permission_classes = [IsAdmin]

    def get(self, request):
        gimnasio = _get_user_gimnasio(request.user)
        if not gimnasio:
            return Response(
                {'detail': 'No tienes un gimnasio asignado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hoy = date.today()
        anio_param = request.query_params.get('año')
        mes_param = request.query_params.get('mes')

        try:
            anio = int(anio_param) if anio_param else hoy.year
        except (TypeError, ValueError):
            anio = hoy.year

        if mes_param:
            try:
                mes = int(mes_param)
                if not 1 <= mes <= 12:
                    raise ValueError
                pagos = Pago.objects.filter(
                    cliente__gimnasio=gimnasio,
                    fecha_pago__year=anio,
                    fecha_pago__month=mes,
                ).select_related('cliente').order_by('-fecha_pago')
                periodo_label = f"{_MESES_ES[mes - 1]} {anio}"
                filename_periodo = f"{anio}-{mes:02d}"
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'El mes seleccionado no es válido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            pagos = Pago.objects.filter(
                cliente__gimnasio=gimnasio,
                fecha_pago__year=anio,
            ).select_related('cliente').order_by('-fecha_pago')
            periodo_label = f"Año {anio}"
            filename_periodo = f"{anio}"

        if not pagos.exists():
            return Response(
                {'detail': f'No hay pagos registrados para el período: {periodo_label}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = pagos.aggregate(total=Sum('monto'))['total'] or 0

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="reporte-pagos-{filename_periodo}.pdf"'

        doc = SimpleDocTemplate(
            response,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("<b>Reporte de Pagos</b>", styles['Title']))
        elements.append(Paragraph(f"Gimnasio: {gimnasio.nombre}", styles['Heading3']))
        elements.append(Paragraph(f"Período: {periodo_label}", styles['Heading4']))
        elements.append(Spacer(1, 0.25 * inch))

        data = [['Cliente', 'Monto', 'Fecha', 'Método de pago']]
        for pago in pagos:
            data.append([
                f"{pago.cliente.nombre} {pago.cliente.apellido}",
                formatear_pesos(pago.monto),
                pago.fecha_pago.strftime('%d/%m/%Y'),
                pago.get_metodo_pago_display(),
            ])
        data.append(['TOTAL', formatear_pesos(total), '', ''])

        table = Table(data, colWidths=[doc.width * 0.38, doc.width * 0.20, doc.width * 0.18, doc.width * 0.24])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#f9fafb')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
        ]))
        elements.append(table)

        elements.append(Spacer(1, 0.25 * inch))
        elements.append(Paragraph(
            f"Generado el {hoy.strftime('%d/%m/%Y')}",
            styles['Normal']
        ))

        doc.build(elements)
        return response


class ClaseViewSet(viewsets.ModelViewSet):
    """CRUD de clases del gimnasio.

    - ENTRENADOR ve, crea, edita y elimina solo sus propias clases (su "Mis Clases").
    - ADMIN puede ver todas las clases del gimnasio pero no crear/editar.
    - CLIENTE puede ver todas las clases del gimnasio y reservar/cancelar.
    """
    serializer_class = ClaseSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'reservar':
            return [IsClienteActivo()]
        if self.action == 'cancelar_reserva':
            return [IsCliente()]
        if self.action == 'reservas':
            return [IsAdminOrEntrenador()]
        # create, update, partial_update, destroy, cancelar
        return [IsEntrenador()]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return Clase.objects.none()
        qs = Clase.objects.filter(gimnasio=gimnasio)
        # Entrenador solo edita/elimina/cancela sus propias clases, y su listado
        # ("Mis Clases" en el frontend) también son solo las suyas — no las de
        # todo el gimnasio. ADMIN y CLIENTE sí ven el listado completo del gym.
        if self.request.user.role == 'ENTRENADOR' and self.action in (
            'list', 'update', 'partial_update', 'destroy'
        ):
            qs = qs.filter(entrenador=self.request.user)
        return qs

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        serializer.save(entrenador=self.request.user, gimnasio=gimnasio)

    @action(detail=True, methods=['post'])
    def reservar(self, request, pk=None):
        """Reservar una clase (solo CLIENTE con membresía ACTIVA)."""
        clase = self.get_object()

        if clase.estado == 'CANCELADA':
            return Response(
                {'detail': 'Esta clase está cancelada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if clase.fecha_hora_inicio < timezone.now():
            return Response(
                {'detail': 'Esta clase ya ocurrió, no se puede reservar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ya_reservado = clase.reservas.filter(
            cliente=request.user, estado='CONFIRMADA'
        ).exists()
        if ya_reservado:
            return Response(
                {'detail': 'Ya tienes una reserva activa para esta clase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # select_for_update() bloquea la fila de la clase mientras dure la
        # transacción, así que si dos clientes reservan el último cupo casi al
        # mismo tiempo, el segundo espera a que el primero termine de contar
        # y crear su reserva antes de hacer su propio conteo (evita sobrecupo
        # por condición de carrera). En SQLite (dev) Django ignora el bloqueo
        # de fila pero la transacción igual serializa las escrituras.
        with transaction.atomic():
            clase = Clase.objects.select_for_update().get(pk=clase.pk)
            confirmadas = clase.reservas.filter(estado='CONFIRMADA').count()
            if confirmadas >= clase.cupo_maximo:
                return Response(
                    {'detail': 'No hay cupos disponibles para esta clase.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            reserva = Reserva.objects.create(cliente=request.user, clase=clase)

        cliente_perfil = getattr(request.user, 'cliente_perfil', None)
        if cliente_perfil:
            revisar_logros_asistencia(cliente_perfil)

        serializer = ReservaSerializer(reserva)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='cancelar-reserva')
    def cancelar_reserva(self, request, pk=None):
        """Cancelar una reserva (solo el CLIENTE que la hizo)."""
        clase = self.get_object()
        try:
            reserva = Reserva.objects.get(
                cliente=request.user, clase=clase, estado='CONFIRMADA'
            )
        except Reserva.DoesNotExist:
            return Response(
                {'detail': 'No tienes una reserva activa para esta clase.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        reserva.estado = 'CANCELADA'
        reserva.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        """Cancelar una clase (cambiar estado a CANCELADA). Solo el entrenador dueño."""
        clase = self.get_object()
        # Entrenador solo puede cancelar sus propias clases (mismo criterio que
        # update/partial_update/destroy en get_queryset y que la acción 'reservas').
        if request.user.role == 'ENTRENADOR' and clase.entrenador_id != request.user.id:
            raise PermissionDenied('Solo puedes cancelar tus propias clases.')
        if clase.estado == 'CANCELADA':
            return Response(
                {'detail': 'Esta clase ya está cancelada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        clase.estado = 'CANCELADA'
        clase.save()
        serializer = self.get_serializer(clase)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def reservas(self, request, pk=None):
        """Ver quién reservó una clase (solo ENTRENADOR o ADMIN)."""
        clase = self.get_object()
        # Entrenador solo puede ver reservas de sus propias clases
        if request.user.role == 'ENTRENADOR' and clase.entrenador_id != request.user.id:
            raise PermissionDenied('Solo puedes ver las reservas de tus propias clases.')
        reservas = clase.reservas.filter(estado='CONFIRMADA').order_by('-fecha_reserva')
        serializer = ReservaSerializer(reservas, many=True)
        return Response(serializer.data)


class CrearCredencialesClienteAPIView(APIView):
    """ADMIN crea credenciales (User) para un Cliente existente."""
    permission_classes = [IsAdmin]

    def post(self, request):
        cliente_id = request.data.get('cliente_id')
        email = request.data.get('email')
        password = request.data.get('password')

        if not cliente_id or not email or not password:
            return Response(
                {'detail': 'cliente_id, email y password son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gimnasio = _get_user_gimnasio(request.user)
        try:
            cliente = Cliente.objects.get(id=cliente_id, gimnasio=gimnasio)
        except Cliente.DoesNotExist:
            return Response(
                {'detail': 'Cliente no encontrado en tu gimnasio.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if cliente.user:
            return Response(
                {'detail': 'Este cliente ya tiene una cuenta vinculada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'detail': 'Ya existe un usuario con este email.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response(
                {'password': e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(email=email, password=password, role='CLIENTE')
        cliente.user = user
        cliente.save()

        return Response(
            {'detail': 'Cuenta creada correctamente para el cliente.'},
            status=status.HTTP_201_CREATED,
        )


class MiMembresiaAPIView(APIView):
    """El cliente logueado ve su propio perfil de membresía."""
    permission_classes = [IsCliente]

    def get(self, request):
        cliente = getattr(request.user, 'cliente_perfil', None)
        if not cliente:
            return Response(
                {'detail': 'No tienes perfil de cliente vinculado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({
            'id': cliente.id,
            'nombre': cliente.nombre,
            'apellido': cliente.apellido,
            'telefono': cliente.telefono,
            'fecha_vencimiento': cliente.fecha_vencimiento,
            'estado': cliente.estado,
        })


class RutinaViewSet(viewsets.ModelViewSet):
    """CRUD de rutinas de ejercicio para principiantes.

    - ADMIN y ENTRENADOR crean/editan/eliminan rutinas de su gimnasio.
    - CLIENTE solo puede ver (read-only).
    """
    serializer_class = RutinaSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdminOrEntrenador()]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return Rutina.objects.none()
        return Rutina.objects.filter(gimnasio=gimnasio).prefetch_related('ejercicios')

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        serializer.save(gimnasio=gimnasio)


class EjercicioViewSet(viewsets.ModelViewSet):
    """CRUD de ejercicios dentro de una rutina.

    - ADMIN y ENTRENADOR crean/editan/eliminan ejercicios de rutinas de su gimnasio.
    - CLIENTE solo puede ver (read-only).
    """
    serializer_class = EjercicioSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdminOrEntrenador()]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return Ejercicio.objects.none()
        qs = Ejercicio.objects.filter(rutina__gimnasio=gimnasio)
        rutina_id = self.request.query_params.get('rutina_id')
        if rutina_id:
            qs = qs.filter(rutina_id=rutina_id)
        return qs

    def _validar_rutina_del_gimnasio(self, gimnasio, rutina):
        if not rutina or rutina.gimnasio_id != getattr(gimnasio, 'id', None):
            raise PermissionDenied('La rutina no pertenece a tu gimnasio.')

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        rutina = serializer.validated_data.get('rutina')
        self._validar_rutina_del_gimnasio(gimnasio, rutina)
        serializer.save()

    def perform_update(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        # Si el payload no trae 'rutina' (PATCH parcial), se valida la rutina
        # actual del ejercicio; si la trae, se valida la nueva para evitar que
        # un ejercicio se reasigne a una rutina de otro gimnasio.
        rutina = serializer.validated_data.get('rutina', serializer.instance.rutina)
        self._validar_rutina_del_gimnasio(gimnasio, rutina)
        serializer.save()


class ProgresoViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """El cliente registra y consulta su propio progreso (peso, foto, nota). Privado, sin visibilidad para el gimnasio."""
    serializer_class = ProgresoSerializer
    permission_classes = [IsCliente]

    def get_queryset(self):
        cliente = getattr(self.request.user, 'cliente_perfil', None)
        if not cliente:
            return Progreso.objects.none()
        return Progreso.objects.filter(cliente=cliente)

    def perform_create(self, serializer):
        cliente = getattr(self.request.user, 'cliente_perfil', None)
        if not cliente:
            raise PermissionDenied('No tienes un perfil de cliente asociado.')
        serializer.save(cliente=cliente)
        revisar_logros_progreso(cliente)


class RetoViewSet(viewsets.ModelViewSet):
    """CRUD de retos del gimnasio.

    - ADMIN crea/edita/elimina retos de su gimnasio.
    - ENTRENADOR y CLIENTE solo pueden ver.
    - CLIENTE además puede unirse y actualizar su propio progreso.
    """
    serializer_class = RetoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action in ('unirse', 'actualizar_progreso'):
            return [IsCliente()]
        return [IsAdmin()]

    def get_queryset(self):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            return Reto.objects.none()
        return Reto.objects.filter(gimnasio=gimnasio).prefetch_related('participaciones')

    def perform_create(self, serializer):
        gimnasio = _get_user_gimnasio(self.request.user)
        if not gimnasio:
            raise NotFound('No tienes un gimnasio asignado.')
        serializer.save(gimnasio=gimnasio)

    @action(detail=True, methods=['post'])
    def unirse(self, request, pk=None):
        """El cliente se une a un reto (si ya está unido, devuelve su participación)."""
        reto = self.get_object()
        cliente = getattr(request.user, 'cliente_perfil', None)
        if not cliente:
            raise PermissionDenied('No tienes un perfil de cliente asociado.')
        if reto.estado != 'ACTIVO':
            return Response(
                {'detail': 'Este reto no está activo; no se puede unir.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # get_or_create no es a prueba de condición de carrera por sí solo pese al
        # unique_together de ParticipacionReto: envolverlo en atomic() y capturar
        # IntegrityError es el patrón que la propia documentación de Django
        # recomienda para este caso (dos clics/reintentos casi simultáneos).
        try:
            with transaction.atomic():
                participacion = ParticipacionReto.objects.create(reto=reto, cliente=cliente)
        except IntegrityError:
            participacion = ParticipacionReto.objects.get(reto=reto, cliente=cliente)

        serializer = ParticipacionRetoSerializer(participacion)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='actualizar-progreso')
    def actualizar_progreso(self, request, pk=None):
        """El cliente suma progreso a su participación en el reto."""
        reto = self.get_object()
        cliente = getattr(request.user, 'cliente_perfil', None)
        if not cliente:
            raise PermissionDenied('No tienes un perfil de cliente asociado.')
        if reto.estado != 'ACTIVO':
            return Response(
                {'detail': 'Este reto no está activo; no se puede sumar progreso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            incremento = int(request.data.get('incremento', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'incremento debe ser un número.'}, status=status.HTTP_400_BAD_REQUEST)
        if incremento <= 0:
            return Response({'detail': 'incremento debe ser mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)

        # select_for_update() dentro de atomic() serializa dos sumas concurrentes
        # de la misma participación (ej. doble clic): la segunda espera a que la
        # primera confirme, así que ambos incrementos se aplican sobre el valor
        # ya actualizado en vez de perderse uno.
        with transaction.atomic():
            try:
                participacion = ParticipacionReto.objects.select_for_update().get(
                    reto=reto, cliente=cliente
                )
            except ParticipacionReto.DoesNotExist:
                return Response(
                    {'detail': 'Primero debes unirte a este reto.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            participacion.progreso_actual = min(participacion.progreso_actual + incremento, reto.meta)
            if not participacion.completado and participacion.progreso_actual >= reto.meta:
                participacion.completado = True
                participacion.fecha_completado = timezone.now()
            participacion.save()

        revisar_completar_reto(participacion)

        serializer = ParticipacionRetoSerializer(participacion)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MisLogrosAPIView(APIView):
    """El cliente logueado ve sus propios logros obtenidos."""
    permission_classes = [IsCliente]

    def get(self, request):
        cliente = getattr(request.user, 'cliente_perfil', None)
        if not cliente:
            return Response([])
        logros = LogroObtenido.objects.filter(cliente=cliente)
        serializer = LogroObtenidoSerializer(logros, many=True)
        return Response(serializer.data)


class FeedAPIView(APIView):
    """Feed comunitario del gimnasio: logros de todos los clientes, si está habilitado."""
    permission_classes = [IsCliente]

    def get(self, request):
        gimnasio = _get_user_gimnasio(request.user)
        if not gimnasio or not gimnasio.feed_habilitado:
            return Response({'habilitado': False, 'logros': []})

        logros = LogroObtenido.objects.filter(cliente__gimnasio=gimnasio).select_related('cliente')[:50]
        serializer = LogroObtenidoSerializer(logros, many=True)
        return Response({'habilitado': True, 'logros': serializer.data})


class TablaLideresAPIView(APIView):
    """Ranking de clientes del gimnasio por cantidad total de logros obtenidos.

    Usa el mismo interruptor que el feed (Gimnasio.feed_habilitado): es parte
    de las funciones sociales que el ADMIN puede apagar desde Configuración.
    """
    permission_classes = [IsCliente]
    TOP_N = 10

    def get(self, request):
        gimnasio = _get_user_gimnasio(request.user)
        if not gimnasio or not gimnasio.feed_habilitado:
            return Response({'habilitado': False, 'ranking': []})

        mi_cliente = getattr(request.user, 'cliente_perfil', None)

        top = (
            Cliente.objects.filter(gimnasio=gimnasio)
            .annotate(total_logros=Count('logros'))
            .filter(total_logros__gt=0)
            .order_by('-total_logros', 'nombre', 'apellido')[:self.TOP_N]
        )
        ranking = [
            {
                'cliente_id': c.id,
                'nombre': c.nombre,
                'apellido': c.apellido,
                'total_logros': c.total_logros,
                'soy_yo': mi_cliente is not None and c.id == mi_cliente.id,
            }
            for c in top
        ]
        return Response({'habilitado': True, 'ranking': ranking})


class MisReservasAPIView(APIView):
    """El cliente logueado ve sus propias reservas."""
    permission_classes = [IsCliente]

    def get(self, request):
        reservas = Reserva.objects.filter(
            cliente=request.user
        ).select_related('clase', 'clase__entrenador').order_by('-fecha_reserva')
        serializer = ReservaSerializer(reservas, many=True)
        return Response(serializer.data)
