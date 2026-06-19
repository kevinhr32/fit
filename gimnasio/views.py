from datetime import date, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ClienteForm, EntrenadorForm, GimnasioForm, PagoForm
from .models import Cliente, Gimnasio, Pago
from accounts.models import User


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
        return render(request, 'gimnasio/dashboard.html', {
            'clientes': [],
            'entrenadores': [],
            'alertas': [],
            'total_vencidos': 0,
            'total_por_vencer': 0,
            'total_activos': 0,
        })
    clientes = gimnasio.clientes.all()
    entrenadores = gimnasio.entrenadores.all()
    vencidos = sum(1 for c in clientes if c.estado == 'VENCIDO')
    por_vencer = sum(1 for c in clientes if c.estado == 'POR_VENCER')
    activos = sum(1 for c in clientes if c.estado == 'ACTIVO')
    
    # Alertas: clientes POR_VENCER y VENCIDO ordenados por fecha de vencimiento
    alertas = [c for c in clientes if c.estado in ['VENCIDO', 'POR_VENCER']]
    alertas.sort(key=lambda c: c.fecha_vencimiento)
    
    context = {
        'clientes': clientes,
        'entrenadores': entrenadores,
        'alertas': alertas,
        'gimnasio': gimnasio,
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


@login_required
def editar_cliente(request, cliente_id):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    # Solo ADMIN puede editar
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para editar clientes.')
        return redirect('dashboard')
    
    cliente = get_object_or_404(Cliente, id=cliente_id, gimnasio=gimnasio)
    
    if request.method == 'POST':
        form = ClienteForm(request.POST, instance=cliente)
        if form.is_valid():
            form.save()
            messages.success(request, 'Cliente actualizado correctamente.')
            return redirect('dashboard')
    else:
        form = ClienteForm(instance=cliente)
    
    return render(request, 'gimnasio/editar_cliente.html', {'form': form, 'cliente': cliente})


@login_required
def eliminar_cliente(request, cliente_id):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    # Solo ADMIN puede eliminar
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para eliminar clientes.')
        return redirect('dashboard')
    
    cliente = get_object_or_404(Cliente, id=cliente_id, gimnasio=gimnasio)
    
    if request.method == 'POST':
        nombre = f'{cliente.nombre} {cliente.apellido}'
        cliente.delete()
        messages.success(request, f'Cliente {nombre} eliminado correctamente.')
        return redirect('dashboard')
    
    return redirect('dashboard')


@login_required
def registrar_pago(request, cliente_id):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    # Solo ADMIN puede registrar pagos
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para registrar pagos.')
        return redirect('dashboard')
    
    cliente = get_object_or_404(Cliente, id=cliente_id, gimnasio=gimnasio)
    
    if request.method == 'POST':
        form = PagoForm(request.POST)
        if form.is_valid():
            pago = form.save(commit=False)
            pago.cliente = cliente
            pago.save()
            messages.success(request, f'Pago de ${pago.monto} registrado correctamente.')
            return redirect('historial_pagos', cliente_id=cliente.id)
    else:
        form = PagoForm()
    
    return render(request, 'gimnasio/registrar_pago.html', {'form': form, 'cliente': cliente})


@login_required
def historial_pagos(request, cliente_id):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    # ADMIN y ENTRENADOR pueden ver historial
    if request.user.role not in ['ADMIN', 'ENTRENADOR']:
        messages.error(request, 'No tienes permisos para ver el historial de pagos.')
        return redirect('dashboard')
    
    cliente = get_object_or_404(Cliente, id=cliente_id, gimnasio=gimnasio)
    pagos = cliente.pagos.all()
    total_pagado = pagos.aggregate(total=Sum('monto'))['total'] or 0
    
    context = {
        'cliente': cliente,
        'pagos': pagos,
        'total_pagado': total_pagado,
    }
    return render(request, 'gimnasio/historial_pagos.html', context)


@login_required
def agregar_entrenador(request):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    # Solo ADMIN puede agregar entrenadores
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para agregar entrenadores.')
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = EntrenadorForm(request.POST)
        if form.is_valid():
            user = User.objects.create_user(
                email=form.cleaned_data['email'],
                password=form.cleaned_data['password'],
                role='ENTRENADOR',
                first_name=form.cleaned_data['first_name'],
                last_name=form.cleaned_data['last_name'],
            )
            user.gimnasio = gimnasio
            user.save()
            messages.success(request, f'Entrenador {user.get_full_name()} agregado correctamente.')
            return redirect('dashboard')
    else:
        form = EntrenadorForm()
    
    return render(request, 'gimnasio/agregar_entrenador.html', {'form': form})


@login_required
def eliminar_entrenador(request, entrenador_id):
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    # Solo ADMIN puede eliminar entrenadores
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para eliminar entrenadores.')
        return redirect('dashboard')
    
    entrenador = get_object_or_404(User, id=entrenador_id, gimnasio=gimnasio, role='ENTRENADOR')
    
    if request.method == 'POST':
        nombre = entrenador.get_full_name() or entrenador.email
        entrenador.gimnasio = None
        entrenador.save()
        messages.success(request, f'Entrenador {nombre} desasignado del gimnasio.')
        return redirect('dashboard')
    
    return redirect('dashboard')


@login_required
def configurar_gimnasio(request):
    # Solo ADMIN y debe ser owner del gimnasio
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para configurar el gimnasio.')
        return redirect('dashboard')
    
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    
    # Verificar que el usuario es el owner
    if gimnasio.owner != request.user:
        messages.error(request, 'No tienes permisos para configurar este gimnasio.')
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = GimnasioForm(request.POST, instance=gimnasio)
        if form.is_valid():
            form.save()
            messages.success(request, 'Configuración del gimnasio actualizada correctamente.')
            return redirect('dashboard')
    else:
        form = GimnasioForm(instance=gimnasio)
    
    return render(request, 'gimnasio/configurar_gimnasio.html', {'form': form, 'gimnasio': gimnasio})
