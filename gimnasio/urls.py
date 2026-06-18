from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/renovar/<int:cliente_id>/', views.renovar, name='renovar'),
    path('dashboard/agregar-cliente/', views.agregar_cliente, name='agregar_cliente'),
]
