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
