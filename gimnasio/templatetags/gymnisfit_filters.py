from django import template

from ..utils import formatear_pesos


register = template.Library()


@register.filter
def pesos(valor):
    """Formatear un valor numérico como pesos colombianos."""
    return formatear_pesos(valor)
