def formatear_pesos(valor):
    """Formatear un valor numérico como pesos colombianos: $ 70.000"""
    try:
        valor = float(valor)
    except (TypeError, ValueError):
        return '$ 0'
    return f"$ {valor:,.0f}".replace(',', '.')
