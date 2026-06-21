import { useState } from 'react';
import api from '../api/client';
import type { Cliente } from '../types';

interface ClienteCardProps {
  cliente: Cliente;
  onRenovar: (cliente: Cliente) => void;
}

const estadoConfig = {
  VENCIDO: {
    label: 'Vencido',
    badge: 'bg-danger/10 text-danger border-danger/20',
    border: 'border-l-danger',
  },
  POR_VENCER: {
    label: 'Por vencer',
    badge: 'bg-warning/10 text-warning border-warning/20',
    border: 'border-l-warning',
  },
  ACTIVO: {
    label: 'Activo',
    badge: 'bg-success/10 text-success border-success/20',
    border: 'border-l-success',
  },
};

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ClienteCard({ cliente, onRenovar }: ClienteCardProps) {
  const [loading, setLoading] = useState(false);
  const config = estadoConfig[cliente.estado];

  const handleRenovar = async () => {
    setLoading(true);
    try {
      const response = await api.post<Cliente>(`clientes/${cliente.id}/renovar/`, {
        dias: 30,
      });
      onRenovar(response.data);
    } catch (error) {
      alert('No se pudo renovar la membresía.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl p-4 border-l-[5px] ${config.border} shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-medium text-navy text-base">
            {cliente.nombre} {cliente.apellido}
          </h3>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${config.badge}`}
          >
            {config.label}
          </span>
        </div>
        <p className="text-slate text-sm">
          Vence el <span className="text-navy font-medium">{formatearFecha(cliente.fecha_vencimiento)}</span>
        </p>
        {cliente.telefono && (
          <p className="text-slate text-xs mt-0.5">{cliente.telefono}</p>
        )}
      </div>

      <button
        onClick={handleRenovar}
        disabled={loading}
        className="self-start sm:self-center inline-flex items-center justify-center bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Renovando...' : 'Renovar'}
      </button>
    </div>
  );
}
