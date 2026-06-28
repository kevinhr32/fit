import { useEffect, useState } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import type { MiMembresia } from '../../types';

function formatApiError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail && typeof data.detail === 'string') return data.detail;
  }
  return 'No se pudo cargar tu membresía.';
}

function formatearFecha(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const estadoConfig = {
  ACTIVO: {
    label: 'Activa',
    badge: 'bg-success/10 text-success border-success/20',
    border: 'border-l-success',
  },
  POR_VENCER: {
    label: 'Por vencer',
    badge: 'bg-warning/10 text-warning border-warning/20',
    border: 'border-l-warning',
  },
  VENCIDO: {
    label: 'Vencida',
    badge: 'bg-danger/10 text-danger border-danger/20',
    border: 'border-l-danger',
  },
};

export default function MiMembresiaPage() {
  const [membresia, setMembresia] = useState<MiMembresia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMembresia = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<MiMembresia>('mi-membresia/');
      setMembresia(response.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembresia();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando tu membresía...</p>
      </div>
    );
  }

  if (error || !membresia) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error || 'Error inesperado'}</p>
        <button
          onClick={fetchMembresia}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const config = estadoConfig[membresia.estado];
  const mostrarAlerta = membresia.estado === 'VENCIDO' || membresia.estado === 'POR_VENCER';

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Mi Membresía
      </h1>

      <div className={`bg-white rounded-2xl shadow-sm p-6 md:p-8 border-l-[6px] ${config.border}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate text-sm font-medium mb-1">Titular</p>
            <p className="text-xl text-navy font-medium">
              {membresia.nombre} {membresia.apellido}
            </p>
          </div>
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full border ${config.badge}`}>
            {config.label}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-accent" />
            <div>
              <p className="text-slate text-xs">Fecha de vencimiento</p>
              <p className="text-navy font-medium">{formatearFecha(membresia.fecha_vencimiento)}</p>
            </div>
          </div>

          {membresia.telefono && (
            <div className="text-sm text-slate">
              <span className="font-medium text-navy">Teléfono: </span>
              {membresia.telefono}
            </div>
          )}
        </div>
      </div>

      {mostrarAlerta && (
        <div
          className={`mt-5 p-4 rounded-xl flex items-start gap-3 ${
            membresia.estado === 'VENCIDO'
              ? 'bg-danger/10 text-danger'
              : 'bg-warning/10 text-warning'
          }`}
        >
          <AlertTriangle size={22} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {membresia.estado === 'VENCIDO'
                ? 'Tu membresía está vencida.'
                : 'Tu membresía está por vencer.'}
            </p>
            <p className="text-sm mt-0.5">
              Contacta al gimnasio para renovar tu membresía y seguir reservando clases.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
