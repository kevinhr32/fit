from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ClienteViewSet,
    ClaseViewSet,
    CrearCredencialesClienteAPIView,
    DashboardAPIView,
    EjercicioViewSet,
    EntrenadorViewSet,
    ExportarPagosPDFAPIView,
    FeedAPIView,
    FinanzasAPIView,
    GimnasioViewSet,
    LogoutAPIView,
    MiMembresiaAPIView,
    MisLogrosAPIView,
    MisReservasAPIView,
    MyTokenObtainPairView,
    PagoViewSet,
    PlanMembresiaViewSet,
    ProgresoViewSet,
    RetoViewSet,
    RutinaViewSet,
    TablaLideresAPIView,
)

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'pagos', PagoViewSet, basename='pago')
router.register(r'entrenadores', EntrenadorViewSet, basename='entrenador')
router.register(r'clases', ClaseViewSet, basename='clase')
router.register(r'progreso', ProgresoViewSet, basename='progreso')
router.register(r'rutinas', RutinaViewSet, basename='rutina')
router.register(r'ejercicios', EjercicioViewSet, basename='ejercicio')
router.register(r'retos', RetoViewSet, basename='reto')
router.register(r'planes-membresia', PlanMembresiaViewSet, basename='plan-membresia')

urlpatterns = [
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutAPIView.as_view(), name='token_logout'),
    path('dashboard/', DashboardAPIView.as_view(), name='api_dashboard'),
    path('finanzas/', FinanzasAPIView.as_view(), name='api_finanzas'),
    path('finanzas/exportar-pdf/', ExportarPagosPDFAPIView.as_view(), name='api_exportar_pdf'),
    path('gimnasio/', GimnasioViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
    }), name='gimnasio'),
    path('clientes/crear-credenciales/', CrearCredencialesClienteAPIView.as_view(), name='crear_credenciales'),
    path('mi-membresia/', MiMembresiaAPIView.as_view(), name='mi_membresia'),
    path('mis-reservas/', MisReservasAPIView.as_view(), name='mis_reservas'),
    path('mis-logros/', MisLogrosAPIView.as_view(), name='mis_logros'),
    path('feed/', FeedAPIView.as_view(), name='feed'),
    path('tabla-lideres/', TablaLideresAPIView.as_view(), name='tabla_lideres'),
] + router.urls
