from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User
from gimnasio.models import Cliente, Clase, Gimnasio, Pago, Reserva


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
    fecha_vencimiento = serializers.DateField(required=False)
    tiene_cuenta = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'apellido', 'telefono',
            'fecha_inicio', 'fecha_vencimiento',
            'activo', 'gimnasio', 'estado', 'plan_dias',
            'tiene_cuenta', 'user',
        ]
        read_only_fields = ['gimnasio', 'estado', 'tiene_cuenta', 'user']

    def get_tiene_cuenta(self, obj):
        return obj.user is not None

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
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'gimnasio', 'password', 'date_joined']
        read_only_fields = ['role', 'gimnasio', 'date_joined']

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['role'] = 'ENTRENADOR'
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ClaseSerializer(serializers.ModelSerializer):
    entrenador_nombre = serializers.CharField(source='entrenador.get_full_name', read_only=True)
    cupos_disponibles = serializers.SerializerMethodField()
    ya_reservado = serializers.SerializerMethodField()

    class Meta:
        model = Clase
        fields = [
            'id', 'nombre', 'entrenador', 'entrenador_nombre',
            'gimnasio', 'fecha_hora_inicio', 'duracion_minutos',
            'cupo_maximo', 'descripcion', 'estado',
            'cupos_disponibles', 'ya_reservado', 'creado_en',
        ]
        read_only_fields = ['entrenador', 'gimnasio', 'estado', 'creado_en']

    def get_cupos_disponibles(self, obj):
        confirmadas = obj.reservas.filter(estado='CONFIRMADA').count()
        return max(0, obj.cupo_maximo - confirmadas)

    def get_ya_reservado(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role != 'CLIENTE':
            return False
        return obj.reservas.filter(cliente=request.user, estado='CONFIRMADA').exists()


class ReservaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.get_full_name', read_only=True)
    cliente_email = serializers.CharField(source='cliente.email', read_only=True)
    clase_nombre = serializers.CharField(source='clase.nombre', read_only=True)
    entrenador_nombre = serializers.CharField(source='clase.entrenador.get_full_name', read_only=True)
    fecha_hora_inicio = serializers.DateTimeField(source='clase.fecha_hora_inicio', read_only=True)

    class Meta:
        model = Reserva
        fields = [
            'id', 'cliente', 'cliente_nombre', 'cliente_email',
            'clase', 'clase_nombre', 'entrenador_nombre', 'fecha_hora_inicio',
            'fecha_reserva', 'estado',
        ]
        read_only_fields = ['cliente', 'clase', 'fecha_reserva', 'estado']


class ClienteCredencialesSerializer(serializers.Serializer):
    """Serializer para que ADMIN cree User a un Cliente existente."""
    cliente_id = serializers.IntegerField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value
