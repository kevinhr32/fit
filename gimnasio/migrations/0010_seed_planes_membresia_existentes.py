from django.db import migrations


PLANES_POR_DEFECTO = [
    ('Mensual', 30),
    ('Bimestral', 60),
    ('Trimestral', 90),
]


def sembrar_planes(apps, schema_editor):
    """Los gimnasios creados antes de este cambio no recibieron los planes por
    defecto (esa siembra la hace la señal post_save de Gimnasio, que solo corre
    al CREAR un gimnasio). Se agregan aquí para que la renovación no les quede
    sin ninguna opción configurada."""
    Gimnasio = apps.get_model('gimnasio', 'Gimnasio')
    PlanMembresia = apps.get_model('gimnasio', 'PlanMembresia')
    for gimnasio in Gimnasio.objects.all():
        if gimnasio.planes_membresia.exists():
            continue
        PlanMembresia.objects.bulk_create([
            PlanMembresia(gimnasio=gimnasio, nombre=nombre, dias=dias)
            for nombre, dias in PLANES_POR_DEFECTO
        ])


def eliminar_planes_sembrados(apps, schema_editor):
    """Reversa: borra únicamente los planes que coinciden exactamente con los
    valores por defecto sembrados arriba (no toca planes que el admin haya
    creado o editado manualmente)."""
    PlanMembresia = apps.get_model('gimnasio', 'PlanMembresia')
    for nombre, dias in PLANES_POR_DEFECTO:
        PlanMembresia.objects.filter(nombre=nombre, dias=dias).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('gimnasio', '0009_planmembresia'),
    ]

    operations = [
        migrations.RunPython(sembrar_planes, eliminar_planes_sembrados),
    ]
