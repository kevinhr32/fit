from datetime import date, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .forms import ClienteForm, EntrenadorForm, GimnasioForm, PagoForm
from .models import Cliente, Gimnasio, Pago
from .utils import formatear_pesos
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
            messages.success(request, f'Pago de {formatear_pesos(pago.monto)} registrado correctamente.')
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


@login_required
def finanzas(request):
    # Solo ADMIN
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para ver las finanzas.')
        return redirect('dashboard')
    
    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')
    
    pagos = Pago.objects.filter(cliente__gimnasio=gimnasio)
    hoy = date.today()
    inicio_mes = hoy.replace(day=1)
    
    # 1. Total mes actual
    total_mes = pagos.filter(fecha_pago__gte=inicio_mes).aggregate(total=Sum('monto'))['total'] or 0
    
    # 2. Total histórico
    total_historico = pagos.aggregate(total=Sum('monto'))['total'] or 0
    
    # 3. Ingresos por mes (últimos 6 meses)
    ingresos_mensuales = []
    for i in range(5, -1, -1):
        mes_inicio = (hoy.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        mes_fin = (mes_inicio + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        total = pagos.filter(fecha_pago__gte=mes_inicio, fecha_pago__lte=mes_fin).aggregate(t=Sum('monto'))['t'] or 0
        ingresos_mensuales.append({
            'mes': mes_inicio.strftime('%b %Y'),
            'total': float(total),
        })
    
    # 4. Por método de pago (donut)
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
    
    # 5. Últimos 10 pagos
    ultimos_pagos = pagos.select_related('cliente')[:10]
    
    # 6. Máximo mensual para escalar el gráfico de barras
    max_mensual = max((m['total'] for m in ingresos_mensuales), default=0)
    
    # 7. Años disponibles para el selector de exportación (actual + 4 anteriores)
    anio_actual = hoy.year
    rango_anios = list(range(anio_actual, anio_actual - 5, -1))

    context = {
        'gimnasio': gimnasio,
        'total_mes': total_mes,
        'total_historico': total_historico,
        'ingresos_mensuales': ingresos_mensuales,
        'metodos_data': metodos_data,
        'ultimos_pagos': ultimos_pagos,
        'max_mensual': max_mensual,
        'anio_actual': anio_actual,
        'mes_actual': hoy.month,
        'rango_anios': rango_anios,
    }
    return render(request, 'gimnasio/finanzas.html', context)


_MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]


@login_required
def exportar_pagos_pdf(request):
    # Solo ADMIN
    if request.user.role != 'ADMIN':
        messages.error(request, 'No tienes permisos para exportar reportes.')
        return redirect('dashboard')

    gimnasio = _get_user_gimnasio(request)
    if not gimnasio:
        messages.error(request, 'No tienes un gimnasio asignado.')
        return redirect('dashboard')

    hoy = date.today()
    anio_param = request.GET.get('año')
    mes_param = request.GET.get('mes')

    try:
        anio = int(anio_param) if anio_param else hoy.year
    except (TypeError, ValueError):
        anio = hoy.year

    # Si se envía mes, filtrar mes específico; de lo contrario, año completo
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
            messages.error(request, 'El mes seleccionado no es válido.')
            return redirect('finanzas')
    else:
        pagos = Pago.objects.filter(
            cliente__gimnasio=gimnasio,
            fecha_pago__year=anio,
        ).select_related('cliente').order_by('-fecha_pago')
        periodo_label = f"Año {anio}"
        filename_periodo = f"{anio}"

    # No generar PDF vacío
    if not pagos.exists():
        messages.warning(request, f'No hay pagos registrados para el período: {periodo_label}.')
        return redirect('finanzas')

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

    # Encabezado
    elements.append(Paragraph("<b>Reporte de Pagos</b>", styles['Title']))
    elements.append(Paragraph(f"Gimnasio: {gimnasio.nombre}", styles['Heading3']))
    elements.append(Paragraph(f"Período: {periodo_label}", styles['Heading4']))
    elements.append(Spacer(1, 0.25 * inch))

    # Tabla de pagos
    data = [['Cliente', 'Monto', 'Fecha', 'Método de pago']]
    for pago in pagos:
        data.append([
            f"{pago.cliente.nombre} {pago.cliente.apellido}",
            formatear_pesos(pago.monto),
            pago.fecha_pago.strftime('%d/%m/%Y'),
            pago.get_metodo_pago_display(),
        ])
    # Fila de total
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
