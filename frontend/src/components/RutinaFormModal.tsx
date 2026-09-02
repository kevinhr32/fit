import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { NivelRutina, Rutina } from '../types';

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
  return 'No se pudo guardar la rutina.';
}

const nivelOptions: { value: NivelRutina; label: string }[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
];

interface RutinaFormModalProps {
  rutina: Rutina | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (rutina: Rutina) => void;
}

export default function RutinaFormModal({ rutina, isOpen, onClose, onSaved }: RutinaFormModalProps) {
  const isEdit = !!rutina;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    nivel: 'PRINCIPIANTE' as NivelRutina,
    descripcion: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm(
        rutina
          ? { nombre: rutina.nombre, nivel: rutina.nivel, descripcion: rutina.descripcion }
          : { nombre: '', nivel: 'PRINCIPIANTE', descripcion: '' }
      );
      setError('');
    }
  }, [rutina, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isEdit && rutina) {
        response = await api.patch<Rutina>(`rutinas/${rutina.id}/`, form);
      } else {
        response = await api.post<Rutina>('rutinas/', form);
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
            {isEdit ? 'Editar rutina' : 'Nueva rutina'}
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
              Nombre de la rutina
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej: Full body principiantes"
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="nivel" className="block text-sm font-medium text-navy mb-1">
              Nivel
            </label>
            <select
              id="nivel"
              name="nivel"
              value={form.nivel}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            >
              {nivelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
              placeholder="¿Para quién es esta rutina y qué la caracteriza?"
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
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear rutina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
