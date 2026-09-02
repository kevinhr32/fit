import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import api from '../api/client';
import type { Reto } from '../types';
import RetoFormModal from '../components/RetoFormModal';
import ConfirmModal from '../components/ConfirmModal';

const estadoConfig = {
  PROXIMO: { label: 'Próximo', badge: 'bg-slate/10 text-slate border-slate/20' },
  ACTIVO: { label: 'Activo', badge: 'bg-success/10 text-success border-success/20' },
  FINALIZADO: { label: 'Finalizado', badge: 'bg-slate/10 text-slate border-slate/20' },
};

function formatearFecha(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RetosPage() {
  const [retos, setRetos] = useState<Reto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [retoForm, setRetoForm] = useState<Reto | null | undefined>(undefined);
  const [retoABorrar, setRetoABorrar] = useState<Reto | null>(null);
  const [borrando, setBorrando] = useState(false);

  const fetchRetos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Reto[]>('retos/');
      setRetos(response.data);
    } catch {
      setError('No se pudieron cargar los retos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetos();
  }, []);

  const handleSaved = (reto: Reto) => {
    setRetos((prev) => {
      const exists = prev.find((r) => r.id === reto.id);
      if (exists) return prev.map((r) => (r.id === reto.id ? reto : r));
      return [reto, ...prev];
    });
  };

  const handleBorrar = async () => {
    if (!retoABorrar) return;
    setBorrando(true);
    try {
      await api.delete(`retos/${retoABorrar.id}/`);
      setRetos((prev) => prev.filter((r) => r.id !== retoABorrar.id));
      setRetoABorrar(null);
    } catch {
      alert('No se pudo eliminar el reto.');
    } finally {
      setBorrando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando retos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchRetos}
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
          Retos
        </h1>
        <button
          onClick={() => setRetoForm(null)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          Nuevo Reto
        </button>
      </div>

      {retos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">Aún no has creado retos para tu gimnasio.</p>
          <p className="text-slate/70 text-sm mt-1">
            Crea el primero con el botón "Nuevo Reto" — tus clientes podrán unirse desde su portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {retos.map((reto) => {
            const config = estadoConfig[reto.estado];
            return (
              <div key={reto.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">{reto.nombre}</p>
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border mt-1.5 ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setRetoForm(reto)}
                      className="p-1.5 text-slate hover:text-navy hover:bg-slate/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setRetoABorrar(reto)}
                      className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {reto.descripcion && <p className="text-slate text-sm">{reto.descripcion}</p>}

                <div className="text-sm text-slate space-y-1">
                  <p>
                    Meta: <span className="font-medium text-navy">{reto.meta}</span> {reto.unidad}
                  </p>
                  <p>
                    {formatearFecha(reto.fecha_inicio)} — {formatearFecha(reto.fecha_fin)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>
                      {reto.participantes_count} participante{reto.participantes_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RetoFormModal
        reto={retoForm || null}
        isOpen={retoForm !== undefined}
        onClose={() => setRetoForm(undefined)}
        onSaved={handleSaved}
      />

      <ConfirmModal
        isOpen={!!retoABorrar}
        title="Eliminar reto"
        message={
          retoABorrar
            ? `¿Estás seguro de eliminar "${retoABorrar.nombre}"? Se eliminará también el progreso de los clientes que se unieron.`
            : ''
        }
        confirmText="Eliminar"
        onConfirm={handleBorrar}
        onCancel={() => setRetoABorrar(null)}
        loading={borrando}
      />
    </div>
  );
}
