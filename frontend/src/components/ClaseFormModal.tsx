import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { Clase } from '../types';

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
  return 'No se pudo guardar la clase.';
}

function splitIso(isoString: string): { fecha: string; hora: string } {
  if (!isoString) return { fecha: '', hora: '' };
  const parts = isoString.split('T');
  return {
    fecha: parts[0] || '',
    hora: parts[1] ? parts[1].substring(0, 5) : '',
  };
}

interface ClaseFormModalProps {
  clase: Clase | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (clase: Clase) => void;
}

export default function ClaseFormModal({
  clase,
  isOpen,
  onClose,
  onSaved,
}: ClaseFormModalProps) {
  const isEdit = !!clase;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    fecha: '',
    hora: '',
    duracion_minutos: 60,
    cupo_maximo: 20,
    descripcion: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (clase) {
        const { fecha, hora } = splitIso(clase.fecha_hora_inicio);
        setForm({
          nombre: clase.nombre,
          fecha,
          hora,
          duracion_minutos: clase.duracion_minutos,
          cupo_maximo: clase.cupo_maximo,
          descripcion: clase.descripcion,
        });
      } else {
        setForm({
          nombre: '',
          fecha: '',
          hora: '',
          duracion_minutos: 60,
          cupo_maximo: 20,
          descripcion: '',
        });
      }
      setError('');
    }
  }, [clase, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'duracion_minutos' || name === 'cupo_maximo' ? parseInt(value || '0', 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      nombre: form.nombre,
      fecha_hora_inicio: `${form.fecha}T${form.hora}:00-05:00`,
      duracion_minutos: form.duracion_minutos,
      cupo_maximo: form.cupo_maximo,
      descripcion: form.descripcion,
    };

    try {
      let response;
      if (isEdit && clase) {
        response = await api.patch<Clase>(`clases/${clase.id}/`, payload);
      } else {
        response = await api.post<Clase>('clases/', payload);
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl text-navy uppercase tracking-tight"
            style={{ fontFamily: "'Archivo Black', sans-serif" }}
          >
            {isEdit ? 'Editar clase' : 'Nueva clase'}
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
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-navy mb-1">
              Nombre de la clase
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej: Zumba, Crossfit, Funcional..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="fecha" className="block text-sm font-medium text-navy mb-1">
                Fecha
              </label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                value={form.fecha}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="hora" className="block text-sm font-medium text-navy mb-1">
                Hora de inicio
              </label>
              <input
                id="hora"
                name="hora"
                type="time"
                value={form.hora}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="duracion_minutos" className="block text-sm font-medium text-navy mb-1">
                Duración (minutos)
              </label>
              <input
                id="duracion_minutos"
                name="duracion_minutos"
                type="number"
                min={1}
                value={form.duracion_minutos}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="cupo_maximo" className="block text-sm font-medium text-navy mb-1">
                Cupo máximo
              </label>
              <input
                id="cupo_maximo"
                name="cupo_maximo"
                type="number"
                min={1}
                value={form.cupo_maximo}
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
              placeholder="Descripción de la clase..."
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
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear clase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
