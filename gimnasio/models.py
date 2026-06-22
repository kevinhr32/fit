from datetime import date, timedelta

from django.conf import settings
from django.db import models

from .utils import formatear_pesos


class Gimnasio(models.Model):
    nombre = models.CharField(max_length=150)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gimnasio_admin',
        limit_choices_to={'role': 'ADMIN'}
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


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
        if self.fecha_vencimiento <= hoy + timedelta(days=5):
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
