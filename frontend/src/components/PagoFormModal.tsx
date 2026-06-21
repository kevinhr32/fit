import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import type { Pago } from '../types';

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
  return 'No se pudo registrar el pago.';
}

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA', label: 'Tarjeta (Legacy)' },
  { value: 'NEQUI_DAVIPLATA', label: 'Nequi / Daviplata' },
  { value: 'BREB', label: 'BRE-B' },
];

interface PagoFormModalProps {
  clienteId: number | null;
  clienteNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function PagoFormModal({
  clienteId,
  clienteNombre,
  isOpen,
  onClose,
  onSaved,
}: PagoFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    monto: '',
    metodo_pago: 'EFECTIVO',
    referencia: '',
    notas: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm({ monto: '', metodo_pago: 'EFECTIVO', referencia: '', notas: '' });
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) return;

    setError('');
    setLoading(true);

    try {
      await api.post<Pago>('pagos/', {
        cliente: clienteId,
        monto: form.monto,
        metodo_pago: form.metodo_pago,
        referencia: form.referencia,
        notas: form.notas,
      });
      onSaved();
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
            Registrar pago
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
            <label className="block text-sm font-medium text-navy mb-1">Cliente</label>
            <input
              type="text"
              value={clienteNombre}
              readOnly
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-slate/5 text-slate cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-navy mb-1">
                Monto
              </label>
              <input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                min="0.01"
                value={form.monto}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="metodo_pago" className="block text-sm font-medium text-navy mb-1">
                Método de pago
              </label>
              <select
                id="metodo_pago"
                name="metodo_pago"
                value={form.metodo_pago}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              >
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="referencia" className="block text-sm font-medium text-navy mb-1">
              Referencia / Comprobante
            </label>
            <input
              id="referencia"
              name="referencia"
              type="text"
              value={form.referencia}
              onChange={handleChange}
              placeholder="Opcional"
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="notas" className="block text-sm font-medium text-navy mb-1">
              Notas
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              value={form.notas}
              onChange={handleChange}
              placeholder="Opcional"
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
              {loading ? 'Guardando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
