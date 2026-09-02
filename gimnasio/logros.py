"""Lógica de otorgamiento de logros automáticos.

Se invoca desde los puntos donde ocurre el evento relevante (crear una
reserva, registrar progreso, completar un reto) en vez de usar señales,
para que el flujo sea explícito y fácil de seguir.
"""
from .models import LogroObtenido, ParticipacionReto


def _otorgar(cliente, tipo, descripcion, reto=None):
    if LogroObtenido.objects.filter(cliente=cliente, tipo=tipo, reto=reto).exists():
        return
    LogroObtenido.objects.create(cliente=cliente, tipo=tipo, descripcion=descripcion, reto=reto)


def revisar_logros_asistencia(cliente):
    """Cliente es la instancia de Cliente vinculada al User que reservó."""
    total = cliente.user.reservas.filter(estado='CONFIRMADA').count()

    if total >= 1:
        _otorgar(cliente, 'PRIMERA_RESERVA', 'Reservaste tu primera clase')
    if total >= 5:
        _otorgar(cliente, 'ASISTENCIA_5', 'Reservaste 5 clases')
    if total >= 10:
        _otorgar(cliente, 'ASISTENCIA_10', 'Reservaste 10 clases')
    if total >= 25:
        _otorgar(cliente, 'ASISTENCIA_25', 'Reservaste 25 clases')


def revisar_logros_progreso(cliente):
    total = cliente.progresos.count()

    if total >= 1:
        _otorgar(cliente, 'PRIMER_PROGRESO', 'Registraste tu primer avance de progreso')
    if total >= 5:
        _otorgar(cliente, 'PROGRESO_CONSTANCIA_5', 'Registraste 5 avances de progreso')


def revisar_completar_reto(participacion: ParticipacionReto):
    if not participacion.completado:
        return
    _otorgar(
        participacion.cliente,
        'RETO_COMPLETADO',
        f'Completaste el reto "{participacion.reto.nombre}"',
        reto=participacion.reto,
    )
