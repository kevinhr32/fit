from datetime import date, timedelta

from django.db import models


class Cliente(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    fecha_inicio = models.DateField()
    fecha_vencimiento = models.DateField()
    activo = models.BooleanField(default=True)

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
