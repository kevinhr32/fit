from datetime import date, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .models import Cliente


@login_required
def dashboard(request):
    clientes = Cliente.objects.all()
    vencidos = sum(1 for c in clientes if c.estado == 'VENCIDO')
    por_vencer = sum(1 for c in clientes if c.estado == 'POR_VENCER')
    activos = sum(1 for c in clientes if c.estado == 'ACTIVO')
    context = {
        'clientes': clientes,
        'total_vencidos': vencidos,
        'total_por_vencer': por_vencer,
        'total_activos': activos,
    }
    return render(request, 'gimnasio/dashboard.html', context)


@login_required
def renovar(request, cliente_id):
    cliente = get_object_or_404(Cliente, id=cliente_id)
    if cliente.estado == 'VENCIDO':
        cliente.fecha_vencimiento = date.today() + timedelta(days=30)
    else:
        cliente.fecha_vencimiento += timedelta(days=30)
    cliente.save()
    messages.success(request, f'Membresía de {cliente.nombre} {cliente.apellido} renovada por 30 días.')
    return redirect('dashboard')
