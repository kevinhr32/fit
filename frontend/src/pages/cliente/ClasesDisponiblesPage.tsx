import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/client';
import type { Clase, MiMembresia } from '../../types';

function formatApiError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail && typeof data.detail === 'string') return data.detail;
  }
  return 'No se pudieron cargar las clases.';
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

export default function ClasesDisponiblesPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [membresia, setMembresia] = useState<MiMembresia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reservandoId, setReservandoId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [clasesRes, membresiaRes] = await Promise.all([
        api.get<Clase[]>('clases/'),
        api.get<MiMembresia>('mi-membresia/'),
      ]);
      const ahora = new Date();
      setClases(
        clasesRes.data.filter(
          (c) => c.estado === 'ACTIVA' && new Date(c.fecha_hora_inicio) > ahora
        )
      );
      setMembresia(membresiaRes.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const handleReservar = async (claseId: number) => {
    setReservandoId(claseId);
    try {
      await api.post(`clases/${claseId}/reservar/`);
      setSuccessMsg('Reserva confirmada correctamente.');
      const response = await api.get<Clase[]>('clases/');
      const ahora = new Date();
      setClases(
        response.data.filter(
          (c) => c.estado === 'ACTIVA' && new Date(c.fecha_hora_inicio) > ahora
        )
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'No se pudo reservar la clase.');
    } finally {
      setReservandoId(null);
    }
  };

  const membresiaActiva = membresia?.estado === 'ACTIVO';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando clases disponibles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchData}
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
        Clases Disponibles
      </h1>

      {successMsg && (
        <div className="mb-5 p-3 rounded-lg bg-success/10 text-success text-sm">
          {successMsg}
        </div>
      )}

      {clases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">No hay clases disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3"
            >
              <div>
                <h3 className="font-medium text-navy text-lg">{clase.nombre}</h3>
                <p className="text-slate text-sm mt-0.5">por {clase.entrenador_nombre}</p>
              </div>

              {clase.descripcion && (
                <p className="text-slate text-sm line-clamp-2">{clase.descripcion}</p>
              )}

              <div className="space-y-1.5 text-sm text-slate">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-accent" />
                  <span>{formatearFechaHora(clase.fecha_hora_inicio)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-accent" />
                  <span>{clase.duracion_minutos} minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  <span>
                    {clase.cupos_disponibles} cupo{clase.cupos_disponibles !== 1 ? 's' : ''} disponible{clase.cupos_disponibles !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                {clase.ya_reservado ? (
                  <div className="flex items-center justify-center gap-2 bg-success/10 text-success text-sm font-medium py-2.5 rounded-lg">
                    <CheckCircle size={18} />
                    Ya reservado
                  </div>
                ) : clase.cupos_disponibles === 0 ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 bg-slate/10 text-slate text-sm font-medium py-2.5 rounded-lg cursor-not-allowed"
                  >
                    <XCircle size={18} />
                    Sin cupo
                  </button>
                ) : !membresiaActiva ? (
                  <button
                    disabled
                    title="Renueva tu membresía en recepción"
                    className="w-full bg-slate/10 text-slate text-sm font-medium py-2.5 rounded-lg cursor-not-allowed"
                  >
                    Renueva tu membresía
                  </button>
                ) : (
                  <button
                    onClick={() => handleReservar(clase.id)}
                    disabled={reservandoId === clase.id}
                    className="w-full bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {reservandoId === clase.id ? 'Reservando...' : 'Reservar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
