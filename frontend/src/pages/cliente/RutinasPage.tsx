import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import api from '../../api/client';
import type { Rutina } from '../../types';

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
      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Rutinas
      </h1>

      {rutinas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">Tu gimnasio aún no ha publicado rutinas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rutinas.map((rutina) => {
            const config = nivelConfig[rutina.nivel];
            const expanded = expandedId === rutina.id;
            return (
              <div key={rutina.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : rutina.id)}
                  className="w-full p-5 flex items-start gap-3 text-left"
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

                {expanded && (
                  <div className="border-t border-slate/10 p-5 bg-bone/40">
                    {rutina.ejercicios.length === 0 ? (
                      <p className="text-slate text-sm">Esta rutina aún no tiene ejercicios.</p>
                    ) : (
                      <div className="space-y-2">
                        {rutina.ejercicios.map((ej) => (
                          <div key={ej.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                            {ej.imagen ? (
                              <img
                                src={ej.imagen}
                                alt={ej.nombre}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="text-navy font-medium text-sm">{ej.nombre}</p>
                              <p className="text-slate text-xs mt-0.5">
                                {ej.series} series × {ej.repeticiones}
                                {ej.descanso_segundos ? ` · ${ej.descanso_segundos}s descanso` : ''}
                              </p>
                            </div>
                            {ej.video_url && (
                              <a
                                href={ej.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-accent hover:text-accent-light rounded-lg transition-colors flex-shrink-0"
                                title="Ver video"
                              >
                                <PlayCircle size={22} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
