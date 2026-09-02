import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import api from '../api/client';
import type { Cliente, PlanMembresia } from '../types';
import { buildWhatsAppUrl, formatearFechaCorta } from '../utils/whatsapp';
import { diasHastaVencimiento, esRenovable } from '../utils/membresia';

function formatApiError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'No se pudo renovar la membresía.';
}

interface ClienteCardProps {
  cliente: Cliente;
  gymName: string;
  /** Planes de membresía activos del gimnasio, para elegir la duración al renovar. */
  planes: PlanMembresia[];
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

export default function ClienteCard({ cliente, gymName, planes, onRenovar }: ClienteCardProps) {
  const [loading, setLoading] = useState(false);
  const [diasElegidos, setDiasElegidos] = useState<number | null>(null);
  const config = estadoConfig[cliente.estado];
  const renovable = esRenovable(cliente.fecha_vencimiento);
  const diasRestantes = diasHastaVencimiento(cliente.fecha_vencimiento);
  const dias = diasElegidos ?? planes[0]?.dias ?? 30;

  const handleRenovar = async () => {
    setLoading(true);
    try {
      const response = await api.post<Cliente>(`clientes/${cliente.id}/renovar/`, {
        dias,
      });
      onRenovar(response.data);
    } catch (error) {
      alert(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const whatsappUrl = cliente.telefono
    ? buildWhatsAppUrl(
        cliente.telefono,
        `${cliente.nombre} ${cliente.apellido}`,
        gymName,
        formatearFechaCorta(cliente.fecha_vencimiento)
      )
    : null;

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

      <div className="flex items-center gap-2 self-start sm:self-center">
        {renovable && planes.length > 1 && (
          <select
            value={dias}
            onChange={(e) => setDiasElegidos(parseInt(e.target.value, 10))}
            disabled={loading}
            className="border border-slate/30 rounded-lg text-navy text-sm px-2 py-2 outline-none focus:border-accent"
          >
            {planes.map((plan) => (
              <option key={plan.id} value={plan.dias}>
                {plan.nombre || `${plan.dias} días`}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleRenovar}
          disabled={loading || !renovable || planes.length === 0}
          title={
            renovable
              ? undefined
              : `Todavía faltan ${diasRestantes} días para el vencimiento; solo se puede renovar con 7 días o menos de anticipación.`
          }
          className="inline-flex items-center justify-center bg-accent hover:bg-accent-light disabled:bg-accent-light/50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Renovando...' : `Renovar ${dias}d`}
        </button>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"
            title="Enviar recordatorio por WhatsApp"
          >
            <MessageCircle size={18} />
          </a>
        )}
      </div>
    </div>
  );
}
