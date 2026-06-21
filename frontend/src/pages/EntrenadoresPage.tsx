import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import type { Entrenador } from '../types';
import EntrenadorFormModal from '../components/EntrenadorFormModal';
import ConfirmModal from '../components/ConfirmModal';

function formatearFecha(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function obtenerNombre(entrenador: Entrenador) {
  const nombre = `${entrenador.first_name} ${entrenador.last_name}`.trim();
  return nombre || entrenador.email;
}

export default function EntrenadoresPage() {
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [entrenadorAEliminar, setEntrenadorAEliminar] = useState<Entrenador | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchEntrenadores = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Entrenador[]>('entrenadores/');
      setEntrenadores(response.data);
    } catch (err) {
      setError('No se pudo cargar la lista de entrenadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntrenadores();
  }, []);

  const handleSaved = (entrenador: Entrenador) => {
    setEntrenadores((prev) => [entrenador, ...prev]);
  };

  const handleEliminar = async () => {
    if (!entrenadorAEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`entrenadores/${entrenadorAEliminar.id}/`);
      setEntrenadores((prev) => prev.filter((e) => e.id !== entrenadorAEliminar.id));
      setEntrenadorAEliminar(null);
    } catch (err) {
      alert('No se pudo desasignar al entrenador.');
    } finally {
      setEliminando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando entrenadores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchEntrenadores}
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
          Entrenadores
        </h1>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          Agregar Entrenador
        </button>
      </div>

      {entrenadores.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">No hay entrenadores registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy text-bone">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Fecha de registro</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/10">
                {entrenadores.map((entrenador) => (
                  <tr key={entrenador.id} className="hover:bg-bone/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">{obtenerNombre(entrenador)}</p>
                    </td>
                    <td className="px-5 py-4 text-slate text-sm">{entrenador.email}</td>
                    <td className="px-5 py-4 text-slate text-sm">{formatearFecha(entrenador.date_joined)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEntrenadorAEliminar(entrenador)}
                          className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Desasignar entrenador"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EntrenadorFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmModal
        isOpen={!!entrenadorAEliminar}
        title="Desasignar entrenador"
        message={
          entrenadorAEliminar
            ? `¿Estás seguro de desasignar a ${obtenerNombre(entrenadorAEliminar)}? Esto desasignará al entrenador, no borrará su cuenta.`
            : ''
        }
        confirmText="Desasignar"
        onConfirm={handleEliminar}
        onCancel={() => setEntrenadorAEliminar(null)}
        loading={eliminando}
      />
    </div>
  );
}
