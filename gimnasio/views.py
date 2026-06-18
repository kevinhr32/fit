from datetime import date, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ClienteForm
from .models import Cliente, Gimnasio


def _get_user_gimnasio(request):
    """Obtener el gimnasio del usuario logueado."""
    if hasattr(request.user, 'gimnasio_admin'):
        return request.user.gimnasio_admin
    if request.user.role == 'ENTRENADOR' and request.user.gimnasio:
        return request.user.gimnasio
    return None


@login_required
def dashboard(request):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return render(request, 'gimnasio/dashboard.html', {
            'clientes': [],
            'total_vencidos': 0,
            'total_por_vencer': 0,
            'total_activos': 0,
        })
    clientes = gimnasio.clientes.all()
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
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    cliente = get_object_or_404(Cliente, id=cliente_id, gimnasio=gimnasio)
    if cliente.estado == 'VENCIDO':
        cliente.fecha_vencimiento = date.today() + timedelta(days=30)
    else:
        cliente.fecha_vencimiento += timedelta(days=30)
    cliente.save()
    messages.success(request, f'Membresía de {cliente.nombre} {cliente.apellido} renovada por 30 días.')
    return redirect('dashboard')


@login_required
def agregar_cliente(request):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    if request.method == 'POST':
        form = ClienteForm(request.POST)
        if form.is_valid():
            cliente = form.save(commit=False)
            cliente.gimnasio = gimnasio
            cliente.save()
            messages.success(request, 'Cliente agregado correctamente.')
            return redirect('dashboard')
    else:
        form = ClienteForm()
    return render(request, 'gimnasio/agregar_cliente.html', {'form': form})
