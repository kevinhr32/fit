export interface Tokens {
  access: string;
  refresh: string;
}

export interface User {
  email: string;
  role: 'ADMIN' | 'ENTRENADOR' | 'CLIENTE';
  gimnasio_id: number | null;
}

export interface Gimnasio {
  id: number;
  nombre: string;
  creado_en: string;
}

export type EstadoCliente = 'ACTIVO' | 'POR_VENCER' | 'VENCIDO';

export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  activo: boolean;
  gimnasio: number;
  estado: EstadoCliente;
  tiene_cuenta: boolean;
  user: number | null;
}

export interface DashboardData {
  gimnasio: Gimnasio;
  total_clientes: number;
  total_vencidos: number;
  total_por_vencer: number;
  total_activos: number;
  alertas: Cliente[];
}

export interface NuevoClientePayload {
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_inicio: string;
  plan_dias: number;
}

export interface Entrenador {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ENTRENADOR';
  gimnasio: number;
  date_joined: string;
}

export interface NuevoEntrenadorPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface IngresoMensual {
  mes: string;
  total: number;
}

export interface MetodoPagoData {
  metodo: string;
  metodo_display: string;
  total: number;
  porcentaje: number;
  color: string;
  offset: number;
}

export interface Pago {
  id: number;
  cliente: number;
  cliente_nombre: string;
  monto: string;
  fecha_pago: string;
  metodo_pago: string;
  referencia: string;
  notas: string;
}

export interface FinanzasData {
  gimnasio: Gimnasio;
  total_mes: number;
  total_historico: number;
  ingresos_mensuales: IngresoMensual[];
  metodos_data: MetodoPagoData[];
  ultimos_pagos: Pago[];
  max_mensual: number;
  anio_actual: number;
  mes_actual: number;
  rango_anios: number[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Clase {
  id: number;
  nombre: string;
  entrenador: number;
  entrenador_nombre: string;
  gimnasio: number;
  fecha_hora_inicio: string;
  duracion_minutos: number;
  cupo_maximo: number;
  descripcion: string;
  estado: 'ACTIVA' | 'CANCELADA';
  cupos_disponibles: number;
  ya_reservado: boolean;
  creado_en: string;
}

export interface Reserva {
  id: number;
  cliente: number;
  cliente_nombre: string;
  cliente_email: string;
  clase: number;
  clase_nombre: string;
  entrenador_nombre: string;
  fecha_hora_inicio: string;
  fecha_reserva: string;
  estado: 'CONFIRMADA' | 'CANCELADA';
}

export interface MiMembresia {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_vencimiento: string;
  estado: 'ACTIVO' | 'POR_VENCER' | 'VENCIDO';
}
