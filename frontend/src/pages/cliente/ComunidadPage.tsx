import { useEffect, useState } from 'react';
import { Award, Medal, Trophy, Users } from 'lucide-react';
import api from '../../api/client';
import type { FeedResponse, Logro, Reto, TablaLideresResponse } from '../../types';

const MEDALLA_POR_POSICION = ['text-warning', 'text-slate', 'text-[#b08d57]'];

const estadoConfig = {
  PROXIMO: { label: 'Próximo', badge: 'bg-slate/10 text-slate border-slate/20' },
  ACTIVO: { label: 'Activo', badge: 'bg-success/10 text-success border-success/20' },
  FINALIZADO: { label: 'Finalizado', badge: 'bg-slate/10 text-slate border-slate/20' },
};

function formatearFecha(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function formatearFechaHora(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ComunidadPage() {
  const [retos, setRetos] = useState<Reto[]>([]);
  const [logros, setLogros] = useState<Logro[]>([]);
  const [feed, setFeed] = useState<FeedResponse>({ habilitado: false, logros: [] });
  const [tablaLideres, setTablaLideres] = useState<TablaLideresResponse>({ habilitado: false, ranking: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [uniendose, setUniendose] = useState<number | null>(null);
  const [incrementos, setIncrementos] = useState<Record<number, string>>({});
  const [actualizando, setActualizando] = useState<number | null>(null);

  const fetchTodo = async () => {
    setLoading(true);
    setError('');
    try {
      const [retosRes, logrosRes, feedRes, lideresRes] = await Promise.all([
        api.get<Reto[]>('retos/'),
        api.get<Logro[]>('mis-logros/'),
        api.get<FeedResponse>('feed/'),
        api.get<TablaLideresResponse>('tabla-lideres/'),
      ]);
      setRetos(retosRes.data);
      setLogros(logrosRes.data);
      setFeed(feedRes.data);
      setTablaLideres(lideresRes.data);
    } catch {
      setError('No se pudo cargar la comunidad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodo();
  }, []);

  const handleUnirse = async (reto: Reto) => {
    setUniendose(reto.id);
    try {
      const response = await api.post(`retos/${reto.id}/unirse/`);
      setRetos((prev) => prev.map((r) => (r.id === reto.id ? { ...r, mi_participacion: response.data } : r)));
    } catch {
      alert('No se pudo unir al reto.');
    } finally {
      setUniendose(null);
    }
  };

  const handleSumarProgreso = async (reto: Reto) => {
    const incremento = parseInt(incrementos[reto.id] || '0', 10);
    if (!incremento || incremento <= 0) return;

    setActualizando(reto.id);
    try {
      const response = await api.post(`retos/${reto.id}/actualizar-progreso/`, { incremento });
      setRetos((prev) => prev.map((r) => (r.id === reto.id ? { ...r, mi_participacion: response.data } : r)));
      setIncrementos((prev) => ({ ...prev, [reto.id]: '' }));
      if (response.data.completado) {
        await fetchTodo();
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'No se pudo actualizar tu progreso.');
    } finally {
      setActualizando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando comunidad...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchTodo}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const retosActivos = retos.filter((r) => r.estado !== 'FINALIZADO');

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1
          className="text-2xl text-navy uppercase tracking-tight mb-6"
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
        >
          Comunidad
        </h1>
      </div>

      <section>
        <h2 className="text-navy font-medium mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-accent" />
          Retos
        </h2>
        {retosActivos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-slate text-sm">Tu gimnasio no tiene retos activos en este momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {retosActivos.map((reto) => {
              const config = estadoConfig[reto.estado];
              const participacion = reto.mi_participacion;
              const porcentaje = participacion
                ? Math.min(100, Math.round((participacion.progreso_actual / reto.meta) * 100))
                : 0;
              return (
                <div key={reto.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-navy">{reto.nombre}</p>
                      <p className="text-slate/70 text-xs mt-0.5">
                        {formatearFecha(reto.fecha_inicio)} — {formatearFecha(reto.fecha_fin)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>

                  {reto.descripcion && <p className="text-slate text-sm mb-3">{reto.descripcion}</p>}

                  <div className="flex items-center gap-1.5 text-xs text-slate mb-3">
                    <Users size={14} />
                    <span>{reto.participantes_count} participantes</span>
                  </div>

                  {!participacion ? (
                    <button
                      onClick={() => handleUnirse(reto)}
                      disabled={uniendose === reto.id || reto.estado !== 'ACTIVO'}
                      className="bg-accent hover:bg-accent-light disabled:bg-accent-light/70 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
                    >
                      {uniendose === reto.id ? 'Uniéndote...' : 'Unirme al reto'}
                    </button>
                  ) : (
                    <div>
                      <div className="w-full h-2 bg-bone rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${participacion.completado ? 'bg-success' : 'bg-accent'}`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate mb-3">
                        {participacion.progreso_actual} / {reto.meta} {reto.unidad}
                      </p>

                      {participacion.completado ? (
                        <span className="inline-flex items-center gap-1.5 bg-success/10 text-success text-sm font-medium px-3 py-1.5 rounded-lg">
                          <Award size={16} />
                          ¡Reto completado!
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            value={incrementos[reto.id] || ''}
                            onChange={(e) => setIncrementos((prev) => ({ ...prev, [reto.id]: e.target.value }))}
                            placeholder="Ej: 5"
                            className="w-24 px-3 py-2 rounded-lg border border-slate/30 bg-white text-navy text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                          />
                          <button
                            onClick={() => handleSumarProgreso(reto)}
                            disabled={actualizando === reto.id}
                            className="bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                          >
                            {actualizando === reto.id ? 'Guardando...' : 'Sumar progreso'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-navy font-medium mb-3 flex items-center gap-2">
          <Award size={18} className="text-accent" />
          Tus logros
        </h2>
        {logros.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-slate text-sm">
              Aún no tienes logros. Reserva clases, registra tu progreso o únete a un reto para desbloquear el primero.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {logros.map((logro) => (
              <div key={logro.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Award size={20} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-navy text-sm font-medium">{logro.descripcion}</p>
                  <p className="text-slate/70 text-xs mt-0.5">{formatearFechaHora(logro.fecha_obtenido)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-navy font-medium mb-3 flex items-center gap-2">
          <Medal size={18} className="text-accent" />
          Tabla de líderes
        </h2>
        {!tablaLideres.habilitado ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-slate text-sm">Tu gimnasio no tiene el feed de comunidad activado.</p>
          </div>
        ) : tablaLideres.ranking.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-slate text-sm">
              Todavía nadie tiene logros. ¡Reserva una clase o únete a un reto para ser el primero!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate/10">
            {tablaLideres.ranking.map((lider, index) => (
              <div
                key={lider.cliente_id}
                className={`flex items-center gap-3 p-4 ${lider.soy_yo ? 'bg-accent/5' : ''}`}
              >
                <div className="w-7 shrink-0 text-center">
                  {index < MEDALLA_POR_POSICION.length ? (
                    <Medal size={20} className={MEDALLA_POR_POSICION[index]} />
                  ) : (
                    <span className="text-slate text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <p className="flex-1 min-w-0 text-sm text-navy truncate">
                  {lider.nombre} {lider.apellido}
                  {lider.soy_yo && <span className="text-accent font-medium"> (tú)</span>}
                </p>
                <p className="text-slate text-xs font-medium shrink-0">
                  {lider.total_logros} {lider.total_logros === 1 ? 'logro' : 'logros'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-navy font-medium mb-3">Actividad del gimnasio</h2>
        {!feed.habilitado ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-slate text-sm">Tu gimnasio no tiene el feed de comunidad activado.</p>
          </div>
        ) : feed.logros.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-slate text-sm">Todavía no hay actividad para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feed.logros.map((logro) => (
              <div key={logro.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Award size={18} className="text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-navy">
                    <span className="font-medium">{logro.cliente_nombre}</span> {logro.descripcion.charAt(0).toLowerCase() + logro.descripcion.slice(1)}
                  </p>
                  <p className="text-slate/70 text-xs mt-0.5">{formatearFechaHora(logro.fecha_obtenido)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
