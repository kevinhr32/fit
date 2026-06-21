import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-2.5 bg-danger/10 rounded-full text-danger shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2
              className="text-lg text-navy uppercase tracking-tight mb-1"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              {title}
            </h2>
            <p className="text-slate text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border border-slate/30 text-navy font-medium hover:bg-slate/5 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-danger hover:bg-danger/90 disabled:bg-danger/70 text-white font-medium transition-colors"
          >
            {loading ? 'Eliminando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
