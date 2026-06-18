from datetime import timedelta

from django import forms

from .models import Cliente


class ClienteForm(forms.ModelForm):
    PLAN_CHOICES = [
        (30, '30 días'),
        (60, '60 días'),
        (90, '90 días'),
    ]
    plan = forms.ChoiceField(choices=PLAN_CHOICES, label='Plan')

    class Meta:
        model = Cliente
        fields = ['nombre', 'apellido', 'telefono', 'fecha_inicio']
        widgets = {
            'fecha_inicio': forms.DateInput(attrs={'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.fecha_inicio and self.instance.fecha_vencimiento:
            dias = (self.instance.fecha_vencimiento - self.instance.fecha_inicio).days
            if dias in [30, 60, 90]:
                self.initial['plan'] = dias

    def save(self, commit=True):
        cliente = super().save(commit=False)
        plan_dias = int(self.cleaned_data['plan'])
        cliente.fecha_vencimiento = cliente.fecha_inicio + timedelta(days=plan_dias)
        if commit:
            cliente.save()
        return cliente