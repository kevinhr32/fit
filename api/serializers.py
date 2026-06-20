from datetime import timedelta

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User
from gimnasio.models import Cliente, Gimnasio, Pago


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token con claims adicionales: role y gimnasio_id."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role

        gimnasio_id = None
        if user.role == 'ADMIN':
            gimnasio_id = getattr(user.gimnasio_admin, 'id', None)
        elif user.role == 'ENTRENADOR':
            gimnasio_id = user.gimnasio_id

        token['gimnasio_id'] = gimnasio_id
        return token


class GimnasioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gimnasio
        fields = ['id', 'nombre', 'creado_en']
        read_only_fields = ['creado_en']


class ClienteSerializer(serializers.ModelSerializer):
    estado = serializers.CharField(read_only=True)
    plan_dias = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'apellido', 'telefono',
            'fecha_inicio', 'fecha_vencimiento',
            'activo', 'gimnasio', 'estado', 'plan_dias',
        ]
        read_only_fields = ['gimnasio', 'estado']

    def _aplicar_plan(self, validated_data):
        plan_dias = validated_data.pop('plan_dias', None)
        if plan_dias:
            fecha_inicio = validated_data.get('fecha_inicio')
            if fecha_inicio:
                validated_data['fecha_vencimiento'] = fecha_inicio + timedelta(days=plan_dias)
        return validated_data

    def create(self, validated_data):
        validated_data = self._aplicar_plan(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._aplicar_plan(validated_data)
        return super().update(instance, validated_data)


class PagoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.__str__', read_only=True)

    class Meta:
        model = Pago
        fields = [
            'id', 'cliente', 'cliente_nombre',
            'monto', 'fecha_pago', 'metodo_pago',
            'referencia', 'notas',
        ]
        read_only_fields = ['fecha_pago']


class EntrenadorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'gimnasio', 'password']
        read_only_fields = ['role', 'gimnasio']

    def create(self, validated_data):
        password = validated_data.pop('password', 'temporal123')
        validated_data['role'] = 'ENTRENADOR'
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user
