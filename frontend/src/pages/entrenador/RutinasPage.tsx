import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import type { Ejercicio, Rutina } from '../../types';
import RutinaFormModal from '../../components/RutinaFormModal';
import EjercicioFormModal from '../../components/EjercicioFormModal';
import ConfirmModal from '../../components/ConfirmModal';

const nivelConfig = {
  PRINCIPIANTE: { label: 'Principiante', badge: 'bg-success/10 text-success border-success/20' },
  INTERMEDIO: { label: 'Intermedio', badge: 'bg-warning/10 text-warning border-warning/20' },
  AVANZADO: { label: 'Avanzado', badge: 'bg-danger/10 text-danger border-danger/20' },
};

export default function RutinasPage() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [rutinaForm, setRutinaForm] = useState<Rutina | null | undefined>(undefined);
  const [rutinaABorrar, setRutinaABorrar] = useState<Rutina | null>(null);
  const [borrandoRutina, setBorrandoRutina] = useState(false);

  const [ejercicioForm, setEjercicioForm] = useState<{ rutinaId: number; ejercicio: Ejercicio | null } | null>(null);
  const [ejercicioABorrar, setEjercicioABorrar] = useState<{ rutinaId: number; ejercicio: Ejercicio } | null>(null);
  const [borrandoEjercicio, setBorrandoEjercicio] = useState(false);

  const fetchRutinas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Rutina[]>('rutinas/');
      setRutinas(response.data);
    } catch {
      setError('No se pudieron cargar las rutinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRutinas();
  }, []);

  const handleRutinaSaved = (rutina: Rutina) => {
    setRutinas((prev) => {
      const exists = prev.find((r) => r.id === rutina.id);
      if (exists) {
        return prev.map((r) => (r.id === rutina.id ? { ...rutina, ejercicios: r.ejercicios } : r));
      }
      return [...prev, { ...rutina, ejercicios: [] }];
    });
  };

  const handleBorrarRutina = async () => {
    if (!rutinaABorrar) return;
    setBorrandoRutina(true);
    try {
      await api.delete(`rutinas/${rutinaABorrar.id}/`);
      setRutinas((prev) => prev.filter((r) => r.id !== rutinaABorrar.id));
      setRutinaABorrar(null);
    } catch {
      alert('No se pudo eliminar la rutina.');
    } finally {
      setBorrandoRutina(false);
    }
  };

  const handleEjercicioSaved = (ejercicio: Ejercicio) => {
    setRutinas((prev) =>
      prev.map((r) => {
        if (r.id !== ejercicio.rutina) return r;
        const exists = r.ejercicios.find((e) => e.id === ejercicio.id);
        const ejercicios = exists
          ? r.ejercicios.map((e) => (e.id === ejercicio.id ? ejercicio : e))
          : [...r.ejercicios, ejercicio];
        ejercicios.sort((a, b) => a.orden - b.orden || a.id - b.id);
        return { ...r, ejercicios };
      })
    );
  };

  const handleBorrarEjercicio = async () => {
    if (!ejercicioABorrar) return;
    setBorrandoEjercicio(true);
    try {
      await api.delete(`ejercicios/${ejercicioABorrar.ejercicio.id}/`);
      setRutinas((prev) =>
        prev.map((r) =>
          r.id === ejercicioABorrar.rutinaId
            ? { ...r, ejercicios: r.ejercicios.filter((e) => e.id !== ejercicioABorrar.ejercicio.id) }
            : r
        )
      );
      setEjercicioABorrar(null);
    } catch {
      alert('No se pudo eliminar el ejercicio.');
    } finally {
      setBorrandoEjercicio(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando rutinas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchRutinas}
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
          Rutinas
        </h1>
        <button
          onClick={() => setRutinaForm(null)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          Nueva Rutina
        </button>
      </div>

      {rutinas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">Aún no has creado rutinas.</p>
          <p className="text-slate/70 text-sm mt-1">
            Crea tu primera rutina con el botón "Nueva Rutina".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rutinas.map((rutina) => {
            const config = nivelConfig[rutina.nivel];
            const expanded = expandedId === rutina.id;
            return (
              <div key={rutina.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4">
                  <button
                    onClick={() => setExpandedId(expanded ? null : rutina.id)}
                    className="flex-1 flex items-start gap-3 text-left"
                  >
                    <div className="mt-0.5 text-slate">
                      {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-navy">{rutina.nombre}</p>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>
                      {rutina.descripcion && (
                        <p className="text-slate text-sm mt-1">{rutina.descripcion}</p>
                      )}
                      <p className="text-slate/70 text-xs mt-1">
                        {rutina.ejercicios.length} ejercicio{rutina.ejercicios.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setRutinaForm(rutina)}
                      className="p-1.5 text-slate hover:text-navy hover:bg-slate/10 rounded-lg transition-colors"
                      title="Editar rutina"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setRutinaABorrar(rutina)}
                      className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Eliminar rutina"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate/10 p-5 bg-bone/40">
                    {rutina.ejercicios.length === 0 ? (
                      <p className="text-slate text-sm mb-4">Esta rutina aún no tiene ejercicios.</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {rutina.ejercicios.map((ej) => (
                          <div
                            key={ej.id}
                            className="bg-white rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-navy font-medium text-sm">{ej.nombre}</p>
                              <p className="text-slate text-xs mt-0.5">
                                {ej.series} series × {ej.repeticiones}
                                {ej.descanso_segundos ? ` · ${ej.descanso_segundos}s descanso` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setEjercicioForm({ rutinaId: rutina.id, ejercicio: ej })}
                                className="p-1.5 text-slate hover:text-navy hover:bg-slate/10 rounded-lg transition-colors"
                                title="Editar ejercicio"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setEjercicioABorrar({ rutinaId: rutina.id, ejercicio: ej })}
                                className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setEjercicioForm({ rutinaId: rutina.id, ejercicio: null })}
                      className="inline-flex items-center gap-1.5 text-accent hover:text-accent-light text-sm font-medium"
                    >
                      <Plus size={16} />
                      Agregar ejercicio
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RutinaFormModal
        rutina={rutinaForm || null}
        isOpen={rutinaForm !== undefined}
        onClose={() => setRutinaForm(undefined)}
        onSaved={handleRutinaSaved}
      />

      <EjercicioFormModal
        ejercicio={ejercicioForm?.ejercicio || null}
        rutinaId={ejercicioForm?.rutinaId ?? null}
        isOpen={!!ejercicioForm}
        onClose={() => setEjercicioForm(null)}
        onSaved={handleEjercicioSaved}
      />

      <ConfirmModal
        isOpen={!!rutinaABorrar}
        title="Eliminar rutina"
        message={
          rutinaABorrar
            ? `¿Estás seguro de eliminar "${rutinaABorrar.nombre}"? Se eliminarán también todos sus ejercicios.`
            : ''
        }
        confirmText="Eliminar"
        onConfirm={handleBorrarRutina}
        onCancel={() => setRutinaABorrar(null)}
        loading={borrandoRutina}
      />

      <ConfirmModal
        isOpen={!!ejercicioABorrar}
        title="Eliminar ejercicio"
        message={
          ejercicioABorrar
            ? `¿Estás seguro de eliminar "${ejercicioABorrar.ejercicio.nombre}"?`
            : ''
        }
        confirmText="Eliminar"
        onConfirm={handleBorrarEjercicio}
        onCancel={() => setEjercicioABorrar(null)}
        loading={borrandoEjercicio}
      />
    </div>
  );
}
