from rest_framework import permissions


class IsAdminOrEntrenador(permissions.BasePermission):
    """Permite acceso solo a usuarios ADMIN o ENTRENADOR."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('ADMIN', 'ENTRENADOR')
        )


class IsAdmin(permissions.BasePermission):
    """Permite acceso solo a usuarios ADMIN."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsEntrenador(permissions.BasePermission):
    """Permite acceso solo a usuarios ENTRENADOR."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ENTRENADOR'


class IsCliente(permissions.BasePermission):
    """Permite acceso solo a usuarios CLIENTE."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CLIENTE'


class IsClienteActivo(permissions.BasePermission):
    """Permite acceso solo a CLIENTES con membresía ACTIVA."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated or request.user.role != 'CLIENTE':
            return False
        cliente = getattr(request.user, 'cliente_perfil', None)
        if not cliente:
            return False
        return cliente.estado == 'ACTIVO'
