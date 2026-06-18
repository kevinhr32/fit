from datetime import date, timedelta

from django.conf import settings
from django.db import models


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


class Pago(models.Model):
    METODO_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('TARJETA', 'Tarjeta'),
    ]

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='pagos'
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_pago = models.DateField(auto_now_add=True)
    metodo_pago = models.CharField(max_length=20, choices=METODO_CHOICES)
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ['-fecha_pago']

    def __str__(self):
        return f'{self.cliente} - ${self.monto} - {self.fecha_pago}'
