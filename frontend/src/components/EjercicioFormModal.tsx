import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { Ejercicio } from '../types';

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
  return 'No se pudo guardar el ejercicio.';
}

interface EjercicioFormModalProps {
  ejercicio: Ejercicio | null;
  rutinaId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (ejercicio: Ejercicio) => void;
}

export default function EjercicioFormModal({
  ejercicio,
  rutinaId,
  isOpen,
  onClose,
  onSaved,
}: EjercicioFormModalProps) {
  const isEdit = !!ejercicio;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nombre: '',
    series: 3,
    repeticiones: '10-12',
    descanso_segundos: 60,
    video_url: '',
    orden: 0,
  });
  const [imagen, setImagen] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(
        ejercicio
          ? {
              nombre: ejercicio.nombre,
              series: ejercicio.series,
              repeticiones: ejercicio.repeticiones,
              descanso_segundos: ejercicio.descanso_segundos ?? 60,
              video_url: ejercicio.video_url,
              orden: ejercicio.orden,
            }
          : { nombre: '', series: 3, repeticiones: '10-12', descanso_segundos: 60, video_url: '', orden: 0 }
      );
      setImagen(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError('');
    }
  }, [ejercicio, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'series' || name === 'descanso_segundos' || name === 'orden' ? parseInt(value || '0', 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEdit && !rutinaId) {
      setError('No se encontró la rutina.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('nombre', form.nombre);
      data.append('series', String(form.series));
      data.append('repeticiones', form.repeticiones);
      data.append('descanso_segundos', String(form.descanso_segundos));
      data.append('video_url', form.video_url);
      data.append('orden', String(form.orden));
      if (imagen) data.append('imagen', imagen);
      if (!isEdit && rutinaId) data.append('rutina', String(rutinaId));

      let response;
      if (isEdit && ejercicio) {
        response = await api.patch<Ejercicio>(`ejercicios/${ejercicio.id}/`, data, {
          headers: { 'Content-Type': undefined },
        });
      } else {
        response = await api.post<Ejercicio>('ejercicios/', data, {
          headers: { 'Content-Type': undefined },
        });
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
            {isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'}
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
              Nombre del ejercicio
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej: Sentadillas con peso corporal"
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="series" className="block text-sm font-medium text-navy mb-1">
                Series
              </label>
              <input
                id="series"
                name="series"
                type="number"
                min={1}
                value={form.series}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="repeticiones" className="block text-sm font-medium text-navy mb-1">
                Repeticiones
              </label>
              <input
                id="repeticiones"
                name="repeticiones"
                type="text"
                value={form.repeticiones}
                onChange={handleChange}
                required
                placeholder="10-12"
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="descanso_segundos" className="block text-sm font-medium text-navy mb-1">
                Descanso (segundos)
              </label>
              <input
                id="descanso_segundos"
                name="descanso_segundos"
                type="number"
                min={0}
                value={form.descanso_segundos}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="orden" className="block text-sm font-medium text-navy mb-1">
                Orden
              </label>
              <input
                id="orden"
                name="orden"
                type="number"
                min={0}
                value={form.orden}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="video_url" className="block text-sm font-medium text-navy mb-1">
              Video (URL opcional)
            </label>
            <input
              id="video_url"
              name="video_url"
              type="url"
              value={form.video_url}
              onChange={handleChange}
              placeholder="https://youtube.com/..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Imagen (opcional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImagen(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-accent/10 file:text-accent file:font-medium hover:file:bg-accent/20"
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
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar ejercicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
