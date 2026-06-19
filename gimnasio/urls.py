from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/renovar/<int:cliente_id>/', views.renovar, name='renovar'),
    path('dashboard/agregar-cliente/', views.agregar_cliente, name='agregar_cliente'),
    path('dashboard/editar-cliente/<int:cliente_id>/', views.editar_cliente, name='editar_cliente'),
    path('dashboard/eliminar-cliente/<int:cliente_id>/', views.eliminar_cliente, name='eliminar_cliente'),
    path('dashboard/registrar-pago/<int:cliente_id>/', views.registrar_pago, name='registrar_pago'),
    path('dashboard/pagos/<int:cliente_id>/', views.historial_pagos, name='historial_pagos'),
    path('dashboard/agregar-entrenador/', views.agregar_entrenador, name='agregar_entrenador'),
    path('dashboard/eliminar-entrenador/<int:entrenador_id>/', views.eliminar_entrenador, name='eliminar_entrenador'),
    path('dashboard/configurar-gimnasio/', views.configurar_gimnasio, name='configurar_gimnasio'),
]
