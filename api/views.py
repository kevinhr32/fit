from datetime import date, timedelta

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import User
from gimnasio.models import Cliente, Gimnasio, Pago

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


class PagoViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Crear y listar pagos del gimnasio."""
    serializer_class = PagoSerializer

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
