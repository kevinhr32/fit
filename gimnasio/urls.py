from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/renovar/<int:cliente_id>/', views.renovar, name='renovar'),
]
