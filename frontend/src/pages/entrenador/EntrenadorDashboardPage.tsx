import { useEffect, useState } from 'react';
import { Plus, Pencil, Ban, Users } from 'lucide-react';
import api from '../../api/client';
import type { Clase } from '../../types';
import ClaseFormModal from '../../components/ClaseFormModal';
import ReservasListModal from '../../components/ReservasListModal';
import ConfirmModal from '../../components/ConfirmModal';

const estadoConfig = {
  ACTIVA: {
    label: 'Activa',
    badge: 'bg-success/10 text-success border-success/20',
  },
  CANCELADA: {
    label: 'Cancelada',
    badge: 'bg-danger/10 text-danger border-danger/20',
  },
};

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

export default function EntrenadorDashboardPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [claseForm, setClaseForm] = useState<Clase | null | undefined>(undefined);
  const isFormOpen = claseForm !== undefined;

  const [claseACancelar, setClaseACancelar] = useState<Clase | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const [claseReservas, setClaseReservas] = useState<Clase | null>(null);

  const fetchClases = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Clase[]>('clases/');
      setClases(response.data);
    } catch (err) {
      setError('No se pudieron cargar tus clases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClases();
  }, []);

  const handleSaved = (clase: Clase) => {
    setClases((prev) => {
      const exists = prev.find((c) => c.id === clase.id);
      if (exists) {
        return prev.map((c) => (c.id === clase.id ? clase : c));
      }
      return [clase, ...prev];
    });
  };

  const handleCancelar = async () => {
    if (!claseACancelar) return;
    setCancelando(true);
    try {
      const response = await api.post<Clase>(`clases/${claseACancelar.id}/cancelar/`);
      setClases((prev) =>
        prev.map((c) => (c.id === response.data.id ? response.data : c))
      );
      setClaseACancelar(null);
    } catch (err) {
      alert('No se pudo cancelar la clase.');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando tus clases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchClases}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1
          className="text-2xl text-navy uppercase tracking-tight"
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
        >
          Mis Clases
        </h1>

        <button
          onClick={() => setClaseForm(null)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          Nueva Clase
        </button>
      </div>

      {clases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">No tienes clases programadas.</p>
          <p className="text-slate/70 text-sm mt-1">
            Crea tu primera clase con el botón "Nueva Clase".
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy text-bone">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Fecha y hora</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Duración</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Cupo</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/10">
                {clases.map((clase) => {
                  const config = estadoConfig[clase.estado];
                  const reservadas = clase.cupo_maximo - clase.cupos_disponibles;
                  return (
                    <tr key={clase.id} className="hover:bg-bone/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">{clase.nombre}</p>
                        {clase.descripcion && (
                          <p className="text-slate text-xs mt-0.5 line-clamp-1">{clase.descripcion}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate text-sm">{formatearFechaHora(clase.fecha_hora_inicio)}</td>
                      <td className="px-5 py-4 text-slate text-sm">{clase.duracion_minutos} min</td>
                      <td className="px-5 py-4 text-slate text-sm">
                        <span className="font-medium text-navy">{reservadas}</span>/{clase.cupo_maximo}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.badge}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setClaseReservas(clase)}
                            className="p-1.5 text-slate hover:text-navy hover:bg-slate/10 rounded-lg transition-colors"
                            title="Ver reservas"
                          >
                            <Users size={18} />
                          </button>
                          <button
                            onClick={() => setClaseForm(clase)}
                            disabled={clase.estado === 'CANCELADA'}
                            className="p-1.5 text-slate hover:text-navy hover:bg-slate/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => setClaseACancelar(clase)}
                            disabled={clase.estado === 'CANCELADA'}
                            className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Cancelar clase"
                          >
                            <Ban size={18} />
                          </button>
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

      <ClaseFormModal
        clase={claseForm || null}
        isOpen={isFormOpen}
        onClose={() => setClaseForm(undefined)}
        onSaved={handleSaved}
      />

      <ReservasListModal
        claseId={claseReservas?.id || null}
        claseNombre={claseReservas?.nombre || ''}
        isOpen={!!claseReservas}
        onClose={() => setClaseReservas(null)}
      />

      <ConfirmModal
        isOpen={!!claseACancelar}
        title="Cancelar clase"
        message={
          claseACancelar
            ? `¿Estás seguro de cancelar la clase "${claseACancelar.nombre}"? Las reservas existentes no se eliminarán, pero la clase quedá inactiva.`
            : ''
        }
        confirmText="Cancelar clase"
        onConfirm={handleCancelar}
        onCancel={() => setClaseACancelar(null)}
        loading={cancelando}
      />
    </div>
  );
}
