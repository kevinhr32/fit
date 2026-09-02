from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from .utils import formatear_pesos

# Un cliente entra en estado POR_VENCER cuando le queda esto o menos para vencer.
# Mismo umbral que usa el frontend para habilitar el botón "Renovar"
# (ver frontend/src/utils/membresia.ts) y que valida api/views.py ClienteViewSet.renovar.
DIAS_PARA_POR_VENCER = 7


class Gimnasio(models.Model):
    nombre = models.CharField(max_length=150)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gimnasio_admin',
        limit_choices_to={'role': 'ADMIN'}
    )
    feed_habilitado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class PlanMembresia(models.Model):
    """Duración de plan que un gimnasio ofrece para altas y renovaciones de clientes
    (ej: Mensual/30 días, Trimestral/90 días). Cada gimnasio administra los suyos
    desde Configuración; no hay un catálogo global fijo."""
    gimnasio = models.ForeignKey(
        Gimnasio,
        on_delete=models.CASCADE,
        related_name='planes_membresia'
    )
    nombre = models.CharField(max_length=50, blank=True, default='')
    dias = models.PositiveIntegerField(help_text='Duración del plan en días (ej: 30, 60, 90, 365)')
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['dias']
        constraints = [
            models.UniqueConstraint(
                fields=['gimnasio', 'dias'],
                name='unique_plan_dias_por_gimnasio'
            )
        ]

    def __str__(self):
        return self.nombre or f'{self.dias} días'


class Cliente(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    fecha_inicio = models.DateField()
    fecha_vencimiento = models.DateField()
    activo = models.BooleanField(default=True)
    gimnasio = models.ForeignKey(
        Gimnasio,
        on_delete=models.PROTECT,
        related_name='clientes',
        null=True,
        blank=True
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='cliente_perfil',
        null=True,
        blank=True
    )

    @property
    def estado(self):
        hoy = date.today()
        if self.fecha_vencimiento < hoy:
            return 'VENCIDO'
        if self.fecha_vencimiento <= hoy + timedelta(days=DIAS_PARA_POR_VENCER):
            return 'POR_VENCER'
        return 'ACTIVO'

    def __str__(self):
        return f'{self.nombre} {self.apellido}'


class Clase(models.Model):
    ESTADO_CHOICES = [
        ('ACTIVA', 'Activa'),
        ('CANCELADA', 'Cancelada'),
    ]

    nombre = models.CharField(max_length=100)
    entrenador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clases',
        limit_choices_to={'role': 'ENTRENADOR'}
    )
    gimnasio = models.ForeignKey(
        Gimnasio,
        on_delete=models.CASCADE,
        related_name='clases'
    )
    fecha_hora_inicio = models.DateTimeField()
    duracion_minutos = models.PositiveIntegerField(default=60)
    cupo_maximo = models.PositiveIntegerField(default=20)
    descripcion = models.TextField(blank=True, default='')
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='ACTIVA')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha_hora_inicio']

    def __str__(self):
        return f'{self.nombre} - {self.fecha_hora_inicio}'


class Reserva(models.Model):
    ESTADO_CHOICES = [
        ('CONFIRMADA', 'Confirmada'),
        ('CANCELADA', 'Cancelada'),
    ]

    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservas'
    )
    clase = models.ForeignKey(
        Clase,
        on_delete=models.CASCADE,
        related_name='reservas'
    )
    fecha_reserva = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default='CONFIRMADA')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['cliente', 'clase'],
                condition=models.Q(estado='CONFIRMADA'),
                name='unique_reserva_activa_por_clase'
            )
        ]
        ordering = ['-fecha_reserva']

    def __str__(self):
        return f'{self.cliente} -> {self.clase}'


class Pago(models.Model):
    METODO_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('TARJETA', 'Tarjeta (Legacy)'),
        ('NEQUI_DAVIPLATA', 'Nequi / Daviplata'),
        ('BREB', 'BRE-B'),
    ]

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='pagos'
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_pago = models.DateField(auto_now_add=True)
    metodo_pago = models.CharField(max_length=20, choices=METODO_CHOICES)
    referencia = models.CharField(max_length=100, blank=True, default='', help_text='Número de comprobante/referencia de la transacción')
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ['-fecha_pago']

    def __str__(self):
        return f'{self.cliente} - {formatear_pesos(self.monto)} - {self.fecha_pago}'


class Progreso(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='progresos'
    )
    fecha = models.DateField(auto_now_add=True)
    peso = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Peso en kg',
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    foto = models.ImageField(upload_to='progreso/', null=True, blank=True)
    nota = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.cliente} - {self.peso}kg - {self.fecha}'


class Reto(models.Model):
    gimnasio = models.ForeignKey(
        Gimnasio,
        on_delete=models.CASCADE,
        related_name='retos'
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    meta = models.PositiveIntegerField(help_text='Meta numérica a alcanzar (ej: 20 sentadillas diarias)')
    unidad = models.CharField(max_length=30, blank=True, default='', help_text='Ej: repeticiones, días, km')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_inicio']

    @property
    def estado(self):
        hoy = date.today()
        if hoy < self.fecha_inicio:
            return 'PROXIMO'
        if hoy > self.fecha_fin:
            return 'FINALIZADO'
        return 'ACTIVO'

    def __str__(self):
        return self.nombre


class ParticipacionReto(models.Model):
    reto = models.ForeignKey(
        Reto,
        on_delete=models.CASCADE,
        related_name='participaciones'
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='participaciones_retos'
    )
    progreso_actual = models.PositiveIntegerField(default=0)
    completado = models.BooleanField(default=False)
    fecha_union = models.DateTimeField(auto_now_add=True)
    fecha_completado = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['reto', 'cliente'],
                name='unique_participacion_por_cliente'
            )
        ]
        ordering = ['-fecha_union']

    def __str__(self):
        return f'{self.cliente} -> {self.reto}'


class LogroObtenido(models.Model):
    TIPO_CHOICES = [
        ('PRIMERA_RESERVA', 'Primera clase reservada'),
        ('ASISTENCIA_5', '5 clases reservadas'),
        ('ASISTENCIA_10', '10 clases reservadas'),
        ('ASISTENCIA_25', '25 clases reservadas'),
        ('PRIMER_PROGRESO', 'Primer registro de progreso'),
        ('PROGRESO_CONSTANCIA_5', '5 registros de progreso'),
        ('RETO_COMPLETADO', 'Reto completado'),
    ]

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='logros'
    )
    tipo = models.CharField(max_length=25, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=200)
    reto = models.ForeignKey(
        Reto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logros'
    )
    fecha_obtenido = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_obtenido']

    def __str__(self):
        return f'{self.cliente} - {self.descripcion}'


@receiver(post_save, sender=Gimnasio)
def crear_planes_membresia_por_defecto(sender, instance, created, **kwargs):
    """Sembrar planes típicos (Mensual/Bimestral/Trimestral/Anual) al crear un
    gimnasio nuevo. Son solo un punto de partida: el ADMIN los edita, desactiva
    o agrega otros (ej. Semestral/180 días) desde Configuración."""
    if created:
        PlanMembresia.objects.bulk_create([
            PlanMembresia(gimnasio=instance, nombre='Mensual', dias=30),
            PlanMembresia(gimnasio=instance, nombre='Bimestral', dias=60),
            PlanMembresia(gimnasio=instance, nombre='Trimestral', dias=90),
            PlanMembresia(gimnasio=instance, nombre='Anual', dias=365),
        ])
