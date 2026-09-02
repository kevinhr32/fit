import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../api/client';
import type { Progreso } from '../../types';
import ConfirmModal from '../../components/ConfirmModal';

function formatApiError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail && typeof data.detail === 'string') return data.detail;

    const messages: string[] = [];
    for (const [field, errors] of Object.entries(data)) {
      if (Array.isArray(errors)) {
        messages.push(`${field}: ${errors.join(', ')}`);
      } else if (typeof errors === 'string') {
        messages.push(`${field}: ${errors}`);
      }
    }
    if (messages.length > 0) return messages.join('; ');
  }
  return 'No se pudo guardar el registro.';
}

function formatearFecha(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MiProgresoPage() {
  const [registros, setRegistros] = useState<Progreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [peso, setPeso] = useState('');
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aBorrar, setABorrar] = useState<Progreso | null>(null);
  const [borrando, setBorrando] = useState(false);

  const fetchRegistros = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Progreso[]>('progreso/');
      setRegistros(response.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!peso) {
      setFormError('Ingresa tu peso.');
      return;
    }

    setGuardando(true);
    try {
      const data = new FormData();
      data.append('peso', peso);
      if (nota) data.append('nota', nota);
      if (foto) data.append('foto', foto);

      await api.post('progreso/', data, {
        headers: { 'Content-Type': undefined },
      });

      setPeso('');
      setNota('');
      setFoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchRegistros();
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setGuardando(false);
    }
  };

  const handleBorrar = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await api.delete(`progreso/${aBorrar.id}/`);
      setRegistros((prev) => prev.filter((r) => r.id !== aBorrar.id));
      setABorrar(null);
    } catch {
      alert('No se pudo eliminar el registro.');
    } finally {
      setBorrando(false);
    }
  };

  const chartData = [...registros]
    .reverse()
    .map((r) => ({ fecha: formatearFecha(r.fecha), peso: parseFloat(r.peso) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando tu progreso...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Mi Progreso
      </h1>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 mb-6">
        <h2 className="text-navy font-medium mb-4">Nuevo registro</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Foto (opcional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-accent/10 file:text-accent file:font-medium hover:file:bg-accent/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Nota (opcional)</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors resize-none"
              placeholder="¿Cómo te sientes hoy?"
            />
          </div>

          {formError && <p className="text-danger text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar registro'}
          </button>
        </form>
      </div>

      {chartData.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 mb-6">
          <h2 className="text-navy font-medium mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" />
            Evolución del peso
          </h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748B20" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} width={40} />
                <Tooltip
                  formatter={(value: any) => [`${value} kg`, 'Peso']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #64748B30', fontSize: 13 }}
                />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="#FF4D2E"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#FF4D2E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {registros.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">Aún no tienes registros de progreso.</p>
          <p className="text-slate/70 text-sm mt-1">
            Agrega tu primer registro arriba para empezar a ver tu evolución.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {registros.map((registro) => (
            <div key={registro.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
              {registro.foto ? (
                <img
                  src={registro.foto}
                  alt="Foto de progreso"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Camera size={22} className="text-accent/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-navy font-medium">{registro.peso} kg</p>
                  <button
                    onClick={() => setABorrar(registro)}
                    aria-label="Eliminar registro"
                    className="p-1 rounded-lg text-slate hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-slate text-xs mt-0.5">{formatearFecha(registro.fecha)}</p>
                {registro.nota && (
                  <p className="text-slate text-sm mt-1.5 line-clamp-2">{registro.nota}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!aBorrar}
        title="Eliminar registro"
        message="¿Estás seguro de eliminar este registro de progreso? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        onConfirm={handleBorrar}
        onCancel={() => setABorrar(null)}
        loading={borrando}
      />
    </div>
  );
}
