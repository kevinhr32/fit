from django.db import models


class Rutina(models.Model):
    NIVEL_CHOICES = [
        ('PRINCIPIANTE', 'Principiante'),
        ('INTERMEDIO', 'Intermedio'),
        ('AVANZADO', 'Avanzado'),
    ]

    nombre = models.CharField(max_length=150)
    nivel = models.CharField(max_length=15, choices=NIVEL_CHOICES, default='PRINCIPIANTE')
    descripcion = models.TextField(blank=True, default='')
    gimnasio = models.ForeignKey(
        'gimnasio.Gimnasio',
        on_delete=models.CASCADE,
        related_name='rutinas'
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Ejercicio(models.Model):
    rutina = models.ForeignKey(
        Rutina,
        on_delete=models.CASCADE,
        related_name='ejercicios'
    )
    nombre = models.CharField(max_length=150)
    series = models.PositiveIntegerField(default=3)
    repeticiones = models.CharField(
        max_length=30, default='10-12',
        help_text='Ej: "10-12", "15", "hasta el fallo"'
    )
    descanso_segundos = models.PositiveIntegerField(null=True, blank=True)
    video_url = models.URLField(blank=True, default='')
    imagen = models.ImageField(upload_to='ejercicios/', null=True, blank=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'id']

    def __str__(self):
        return f'{self.nombre} ({self.rutina})'
