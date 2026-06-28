import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import api from '../../api/client';
import type { Reserva } from '../../types';
import ConfirmModal from '../../components/ConfirmModal';

function formatApiError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail && typeof data.detail === 'string') return data.detail;
  }
  return 'No se pudieron cargar tus reservas.';
}

function formatearFechaHora(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const estadoConfig = {
  CONFIRMADA: {
    label: 'Confirmada',
    badge: 'bg-success/10 text-success border-success/20',
  },
  CANCELADA: {
    label: 'Cancelada',
    badge: 'bg-danger/10 text-danger border-danger/20',
  },
};

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reservaACancelar, setReservaACancelar] = useState<Reserva | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const fetchReservas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Reserva[]>('mis-reservas/');
      setReservas(response.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
  }, []);

  const handleCancelar = async () => {
    if (!reservaACancelar) return;
    setCancelando(true);
    try {
      await api.delete(`clases/${reservaACancelar.clase}/cancelar-reserva/`);
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reservaACancelar.id ? { ...r, estado: 'CANCELADA' as const } : r
        )
      );
      setReservaACancelar(null);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'No se pudo cancelar la reserva.');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando tus reservas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchReservas}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Mis Reservas
      </h1>

      {reservas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">No tienes reservas registradas.</p>
          <p className="text-slate/70 text-sm mt-1">
            Ve a "Clases Disponibles" para reservar tu primera clase.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy text-bone">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Clase</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Entrenador</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Fecha y hora</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/10">
                {reservas.map((reserva) => {
                  const config = estadoConfig[reserva.estado];
                  return (
                    <tr key={reserva.id} className="hover:bg-bone/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">{reserva.clase_nombre}</p>
                      </td>
                      <td className="px-5 py-4 text-slate text-sm">{reserva.entrenador_nombre}</td>
                      <td className="px-5 py-4 text-slate text-sm">{formatearFechaHora(reserva.fecha_hora_inicio)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.badge}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {reserva.estado === 'CONFIRMADA' && (
                            <button
                              onClick={() => setReservaACancelar(reserva)}
                              className="inline-flex items-center gap-1.5 text-slate hover:text-danger text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-danger/10 transition-colors"
                              title="Cancelar reserva"
                            >
                              <Ban size={16} />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!reservaACancelar}
        title="Cancelar reserva"
        message={
          reservaACancelar
            ? `¿Estás seguro de cancelar tu reserva para "${reservaACancelar.clase_nombre}"?`
            : ''
        }
        confirmText="Cancelar reserva"
        onConfirm={handleCancelar}
        onCancel={() => setReservaACancelar(null)}
        loading={cancelando}
      />
    </div>
  );
}
