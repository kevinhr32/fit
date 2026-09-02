from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrador'
    ENTRENADOR = 'ENTRENADOR', 'Entrenador'
    CLIENTE = 'CLIENTE', 'Cliente'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENTE)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    gimnasio = models.ForeignKey(
        'gimnasio.Gimnasio',
        on_delete=models.SET_NULL,
        related_name='entrenadores',
        null=True,
        blank=True
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['role']

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()


@receiver(post_save, sender=User)
def create_gimnasio_for_admin(sender, instance, created, **kwargs):
    """Crear Gimnasio automáticamente cuando un usuario es ADMIN (creado o role cambiado)."""
    if instance.role == 'ADMIN':
        from gimnasio.models import Gimnasio
        Gimnasio.objects.get_or_create(
            owner=instance,
            defaults={'nombre': f'Gimnasio de {instance.email}'}
        )
        # Un ADMIN es dueño de su propio gimnasio, no entrenador de otro: si el
        # usuario tenía un `gimnasio` heredado de cuando era ENTRENADOR (o de un
        # rol previo), hay que limpiarlo para que no quede una relación fantasma
        # si más adelante su rol se revierte a ENTRENADOR.
        # Se usa .update() (no instance.save()) para no re-disparar esta misma
        # señal en un bucle infinito.
        if instance.gimnasio_id is not None:
            User.objects.filter(pk=instance.pk).update(gimnasio=None)
            instance.gimnasio_id = None
