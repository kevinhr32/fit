from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ClienteViewSet,
    DashboardAPIView,
    EntrenadorViewSet,
    ExportarPagosPDFAPIView,
    FinanzasAPIView,
    GimnasioViewSet,
    LogoutAPIView,
    MyTokenObtainPairView,
    PagoViewSet,
)

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'pagos', PagoViewSet, basename='pago')
router.register(r'entrenadores', EntrenadorViewSet, basename='entrenador')

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
] + router.urls
