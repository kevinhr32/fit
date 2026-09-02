from django.db import migrations


def agregar_plan_anual(apps, schema_editor):
    """La migración 0010 sembró Mensual/Bimestral/Trimestral pero se quedó corta:
    faltaba Anual (365 días) en el rango de defaults pedido. Se agrega aquí a
    cualquier gimnasio que todavía no tenga un plan de 365 días (sin duplicar
    si un admin ya lo agregó manualmente)."""
    Gimnasio = apps.get_model('gimnasio', 'Gimnasio')
    PlanMembresia = apps.get_model('gimnasio', 'PlanMembresia')
    for gimnasio in Gimnasio.objects.all():
        if gimnasio.planes_membresia.filter(dias=365).exists():
            continue
        PlanMembresia.objects.create(gimnasio=gimnasio, nombre='Anual', dias=365)


def eliminar_plan_anual_sembrado(apps, schema_editor):
    PlanMembresia = apps.get_model('gimnasio', 'PlanMembresia')
    PlanMembresia.objects.filter(nombre='Anual', dias=365).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('gimnasio', '0010_seed_planes_membresia_existentes'),
    ]

    operations = [
        migrations.RunPython(agregar_plan_anual, eliminar_plan_anual_sembrado),
    ]
