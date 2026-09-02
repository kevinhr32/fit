import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { Reto } from '../types';

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
  return 'No se pudo guardar el reto.';
}

interface RetoFormModalProps {
  reto: Reto | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (reto: Reto) => void;
}

export default function RetoFormModal({ reto, isOpen, onClose, onSaved }: RetoFormModalProps) {
  const isEdit = !!reto;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    meta: 20,
    unidad: '',
    fecha_inicio: '',
    fecha_fin: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm(
        reto
          ? {
              nombre: reto.nombre,
              descripcion: reto.descripcion,
              meta: reto.meta,
              unidad: reto.unidad,
              fecha_inicio: reto.fecha_inicio,
              fecha_fin: reto.fecha_fin,
            }
          : { nombre: '', descripcion: '', meta: 20, unidad: '', fecha_inicio: '', fecha_fin: '' }
      );
      setError('');
    }
  }, [reto, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'meta' ? parseInt(value || '0', 10) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isEdit && reto) {
        response = await api.patch<Reto>(`retos/${reto.id}/`, form);
      } else {
        response = await api.post<Reto>('retos/', form);
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
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl text-navy uppercase tracking-tight"
            style={{ fontFamily: "'Archivo Black', sans-serif" }}
          >
            {isEdit ? 'Editar reto' : 'Nuevo reto'}
          </h2>
          <button onClick={onClose} className="text-slate hover:text-navy transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-navy mb-1">
              Nombre del reto
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej: 20 sentadillas diarias en julio"
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="meta" className="block text-sm font-medium text-navy mb-1">
                Meta
              </label>
              <input
                id="meta"
                name="meta"
                type="number"
                min={1}
                value={form.meta}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="unidad" className="block text-sm font-medium text-navy mb-1">
                Unidad (opcional)
              </label>
              <input
                id="unidad"
                name="unidad"
                type="text"
                value={form.unidad}
                onChange={handleChange}
                placeholder="Ej: repeticiones, días, km"
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
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
              <label htmlFor="fecha_fin" className="block text-sm font-medium text-navy mb-1">
                Fecha de fin
              </label>
              <input
                id="fecha_fin"
                name="fecha_fin"
                type="date"
                value={form.fecha_fin}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-navy mb-1">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={3}
              value={form.descripcion}
              onChange={handleChange}
              placeholder="¿En qué consiste el reto?"
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors resize-none"
            />
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
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear reto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
