from datetime import date, timedelta

from django.db.models import Sum
from django.http import HttpResponse
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
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import User
from gimnasio.models import Cliente, Gimnasio, Pago
from gimnasio.utils import formatear_pesos

from .permissions import IsAdmin, IsAdminOrEntrenador
from .serializers import (
    ClienteSerializer,
    EntrenadorSerializer,
    GimnasioSerializer,
    MyTokenObtainPairSerializer,
    PagoSerializer,
)


def _get_user_gimnasio(user):
    """Obtener el gimnasio asociado al usuario (ADMIN o ENTRENADOR)."""
    if user.role == 'ADMIN':
        return getattr(user, 'gimnasio_admin', None)
    if user.role == 'ENTRENADOR':
        return user.gimnasio
    return None


class MyTokenObtainPairView(TokenObtainPairView):
    """Login vía JWT con claims adicionales."""
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = [AllowAny]


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
        """Renovar la membresía de un cliente extendiendo su fecha de vencimiento."""
        cliente = self.get_object()
        dias = request.data.get('dias', 30)
        try:
            dias = int(dias)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'El campo "dias" debe ser un número entero válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        base = max(cliente.fecha_vencimiento, date.today())
        cliente.fecha_vencimiento = base + timedelta(days=dias)
        cliente.activo = True
        cliente.save()

        serializer = self.get_serializer(cliente)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
