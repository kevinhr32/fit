from datetime import timedelta

from django import forms

from .models import Cliente, Gimnasio, Pago


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


class PagoForm(forms.ModelForm):
    class Meta:
        model = Pago
        fields = ['monto', 'metodo_pago', 'notas']
        widgets = {
            'monto': forms.NumberInput(attrs={'step': '0.01', 'min': '0.01', 'class': 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}),
            'metodo_pago': forms.Select(attrs={'class': 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}),
            'notas': forms.Textarea(attrs={'rows': 3, 'class': 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}),
        }


class EntrenadorForm(forms.Form):
    first_name = forms.CharField(max_length=150, label='Nombre')
    last_name = forms.CharField(max_length=150, label='Apellido')
    email = forms.EmailField(label='Email')
    password = forms.CharField(widget=forms.PasswordInput, label='Contraseña temporal')


class GimnasioForm(forms.ModelForm):
    class Meta:
        model = Gimnasio
        fields = ['nombre']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                'placeholder': 'Nombre del gimnasio'
            }),
        }