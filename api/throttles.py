from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Throttle para el endpoint de login: 5 intentos/minuto por IP."""
    scope = 'anon_login'
