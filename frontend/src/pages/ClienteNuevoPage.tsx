import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft } from 'lucide-react';

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
  return 'No se pudo guardar el cliente.';
}

export default function ClienteNuevoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    plan_dias: 30,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'plan_dias' ? parseInt(value || '0', 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('clientes/', form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-slate hover:text-navy text-sm font-medium mb-6"
      >
        <ArrowLeft size={18} />
        Volver al dashboard
      </button>

      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Nuevo cliente
      </h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger/10 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-navy mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-navy mb-1">
                Apellido
              </label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                value={form.apellido}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-navy mb-1">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              value={form.telefono}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="fecha_inicio" className="block text-sm font-medium text-navy mb-1">
                Fecha de inicio
              </label>
              <input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                value={form.fecha_inicio}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="plan_dias" className="block text-sm font-medium text-navy mb-1">
                Días del plan
              </label>
              <input
                id="plan_dias"
                name="plan_dias"
                type="number"
                min={1}
                value={form.plan_dias}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-lg border border-slate/30 text-navy font-medium hover:bg-slate/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
