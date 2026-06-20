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
