import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { Cliente } from '../types';

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

interface ClienteFormModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
}

const PLAN_DIAS_OPTIONS = [30, 60, 90];

export default function ClienteFormModal({
  cliente,
  isOpen,
  onClose,
  onSaved,
}: ClienteFormModalProps) {
  const isEdit = !!cliente;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    plan_dias: 30,
  });

  useEffect(() => {
    if (cliente) {
      setForm({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
        fecha_inicio: cliente.fecha_inicio,
        plan_dias: 30,
      });
    } else {
      setForm({
        nombre: '',
        apellido: '',
        telefono: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        plan_dias: 30,
      });
    }
    setError('');
  }, [cliente, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'plan_dias' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isEdit && cliente) {
        response = await api.patch<Cliente>(`clientes/${cliente.id}/`, form);
      } else {
        response = await api.post<Cliente>('clientes/', form);
      }
      onSaved(response.data);
      onClose();
    } catch (err: any) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl text-navy uppercase tracking-tight"
            style={{ fontFamily: "'Archivo Black', sans-serif" }}
          >
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
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
              <select
                id="plan_dias"
                name="plan_dias"
                value={form.plan_dias}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              >
                {PLAN_DIAS_OPTIONS.map((dias) => (
                  <option key={dias} value={dias}>
                    {dias} días
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-slate/30 text-navy font-medium hover:bg-slate/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
