import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { Reserva } from '../types';

interface ReservasListModalProps {
  claseId: number | null;
  claseNombre: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatearFechaReserva(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReservasListModal({
  claseId,
  claseNombre,
  isOpen,
  onClose,
}: ReservasListModalProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && claseId) {
      setLoading(true);
      setError('');
      api
        .get<Reserva[]>(`clases/${claseId}/reservas/`)
        .then((response) => setReservas(response.data))
        .catch(() => setError('No se pudieron cargar las reservas.'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, claseId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-xl text-navy uppercase tracking-tight"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              Reservas
            </h2>
            <p className="text-slate text-sm mt-0.5">{claseNombre}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate hover:text-navy transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger/10 text-danger text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <p className="text-slate">Cargando reservas...</p>
          </div>
        ) : reservas.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate">Nadie ha reservado esta clase todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map((reserva) => (
              <div
                key={reserva.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bone/50 border border-slate/10"
              >
                <div>
                  <p className="font-medium text-navy text-sm">
                    {reserva.cliente_nombre || reserva.cliente_email}
                  </p>
                  <p className="text-slate text-xs mt-0.5">{reserva.cliente_email}</p>
                  <p className="text-slate text-xs mt-0.5">
                    Reservado el {formatearFechaReserva(reserva.fecha_reserva)}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-success/10 text-success border-success/20">
                  {reserva.estado === 'CONFIRMADA' ? 'Confirmada' : 'Cancelada'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-5">
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 rounded-lg border border-slate/30 text-navy font-medium hover:bg-slate/5 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
