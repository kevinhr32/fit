import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Wallet, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import api from '../api/client';
import type { Cliente, PlanMembresia } from '../types';
import ClienteFormModal from '../components/ClienteFormModal';
import ConfirmModal from '../components/ConfirmModal';
import PagoFormModal from '../components/PagoFormModal';
import ClienteCredencialesModal from '../components/ClienteCredencialesModal';
import { buildWhatsAppUrl, formatearFechaCorta } from '../utils/whatsapp';
import { diasHastaVencimiento, esRenovable } from '../utils/membresia';

const estadoConfig = {
  VENCIDO: {
    label: 'Vencido',
    badge: 'bg-danger/10 text-danger border-danger/20',
  },
  POR_VENCER: {
    label: 'Por vencer',
    badge: 'bg-warning/10 text-warning border-warning/20',
  },
  ACTIVO: {
    label: 'Activo',
    badge: 'bg-success/10 text-success border-success/20',
  },
};

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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
  return 'No se pudo cargar la lista de clientes.';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [gymName, setGymName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState('');

  const [clienteForm, setClienteForm] = useState<Cliente | null | undefined>(undefined);
  const isFormOpen = clienteForm !== undefined;

  const [clientePago, setClientePago] = useState<Cliente | null>(null);
  const isPagoOpen = clientePago !== null;

  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [renovandoId, setRenovandoId] = useState<number | null>(null);
  const [clienteCredenciales, setClienteCredenciales] = useState<Cliente | null>(null);
  const isCredencialesOpen = clienteCredenciales !== null;

  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [diasPorCliente, setDiasPorCliente] = useState<Record<number, number>>({});

  const planesActivos = useMemo(() => planes.filter((p) => p.activo), [planes]);

  const diasParaRenovar = (clienteId: number) =>
    diasPorCliente[clienteId] ?? planesActivos[0]?.dias ?? 30;

  const fetchClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const [clientesRes, gymRes, planesRes] = await Promise.all([
        api.get<Cliente[]>('clientes/'),
        api.get<{ nombre: string }>('gimnasio/'),
        api.get<PlanMembresia[]>('planes-membresia/'),
      ]);
      setClientes(clientesRes.data);
      setGymName(gymRes.data.nombre);
      setPlanes(planesRes.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return clientes;
    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);

  const handleSaved = (cliente: Cliente) => {
    setClientes((prev) => {
      const exists = prev.find((c) => c.id === cliente.id);
      if (exists) {
        return prev.map((c) => (c.id === cliente.id ? cliente : c));
      }
      return [cliente, ...prev];
    });
  };

  const handleRenovar = async (id: number) => {
    setRenovandoId(id);
    try {
      const response = await api.post<Cliente>(`clientes/${id}/renovar/`, {
        dias: diasParaRenovar(id),
      });
      setClientes((prev) =>
        prev.map((c) => (c.id === response.data.id ? response.data : c))
      );
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setRenovandoId(null);
    }
  };

  const handleEliminar = async () => {
    if (!clienteAEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`clientes/${clienteAEliminar.id}/`);
      setClientes((prev) => prev.filter((c) => c.id !== clienteAEliminar.id));
      setClienteAEliminar(null);
    } catch (err) {
      alert('No se pudo eliminar el cliente.');
    } finally {
      setEliminando(false);
    }
  };

  const handlePagoSaved = () => {
    setSuccess('Pago registrado correctamente.');
  };

  const handleCredencialesSaved = (clienteId: number) => {
    setClientes((prev) =>
      prev.map((c) => (c.id === clienteId ? { ...c, tiene_cuenta: true } : c))
    );
    setSuccess('Cuenta creada correctamente para el cliente.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error}</p>
        <button
          onClick={fetchClientes}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Clientes
      </h1>

      {success && (
        <div className="mb-5 p-3 rounded-lg bg-success/10 text-success text-sm">
          {success}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            placeholder="Buscar por nombre..."
          />
        </div>

        <button
          onClick={() => setClienteForm(null)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          Agregar Cliente
        </button>
      </div>

      {filteredClientes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-slate">
            {searchTerm ? 'No se encontraron clientes con ese nombre.' : 'No hay clientes registrados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy text-bone">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Teléfono</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Inicio</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Vencimiento</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/10">
                {filteredClientes.map((cliente) => {
                  const config = estadoConfig[cliente.estado];
                  const renovable = esRenovable(cliente.fecha_vencimiento);
                  const diasRestantes = diasHastaVencimiento(cliente.fecha_vencimiento);
                  const whatsappUrl =
                    cliente.telefono && gymName && (cliente.estado === 'VENCIDO' || cliente.estado === 'POR_VENCER')
                      ? buildWhatsAppUrl(
                          cliente.telefono,
                          `${cliente.nombre} ${cliente.apellido}`,
                          gymName,
                          formatearFechaCorta(cliente.fecha_vencimiento)
                        )
                      : null;

                  return (
                    <tr key={cliente.id} className="hover:bg-bone/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">
                          {cliente.nombre} {cliente.apellido}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate text-sm">{cliente.telefono}</td>
                      <td className="px-5 py-4 text-slate text-sm">{formatearFecha(cliente.fecha_inicio)}</td>
                      <td className="px-5 py-4 text-slate text-sm">{formatearFecha(cliente.fecha_vencimiento)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.badge}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className="inline-flex items-center rounded-lg overflow-hidden border border-accent/20"
                            title={
                              renovable
                                ? undefined
                                : `Todavía faltan ${diasRestantes} días para el vencimiento; solo se puede renovar con 7 días o menos de anticipación.`
                            }
                          >
                            {planesActivos.length > 1 && (
                              <select
                                value={diasParaRenovar(cliente.id)}
                                onChange={(e) =>
                                  setDiasPorCliente((prev) => ({
                                    ...prev,
                                    [cliente.id]: parseInt(e.target.value, 10),
                                  }))
                                }
                                disabled={!renovable}
                                className="bg-accent/10 text-accent text-xs font-medium pl-2.5 pr-1 py-1.5 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {planesActivos.map((plan) => (
                                  <option key={plan.id} value={plan.dias}>
                                    {plan.nombre || `${plan.dias}d`}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              onClick={() => handleRenovar(cliente.id)}
                              disabled={renovandoId === cliente.id || !renovable || planesActivos.length === 0}
                              className="inline-flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium pl-2 pr-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-accent/10"
                            >
                              <RefreshCw size={14} className={renovandoId === cliente.id ? 'animate-spin' : ''} />
                              {renovandoId === cliente.id
                                ? 'Renovando'
                                : `Renovar ${diasParaRenovar(cliente.id)}d`}
                            </button>
                          </div>

                          <button
                            onClick={() => setClientePago(cliente)}
                            className="inline-flex items-center gap-1.5 bg-success/10 hover:bg-success/20 text-success text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Wallet size={14} />
                            Registrar pago
                          </button>

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition-colors"
                              title="Enviar recordatorio por WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}

                          {cliente.tiene_cuenta ? (
                            <span
                              className="p-1.5 text-success cursor-default"
                              title="Cuenta creada"
                            >
                              <UserCheck size={18} />
                            </span>
                          ) : (
                            <button
                              onClick={() => setClienteCredenciales(cliente)}
                              className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                              title="Crear cuenta"
                            >
                              <UserPlus size={18} />
                            </button>
                          )}

                          <button
                            onClick={() => setClienteForm(cliente)}
                            className="p-1.5 text-slate hover:text-navy hover:bg-slate/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            onClick={() => setClienteAEliminar(cliente)}
                            className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ClienteFormModal
        cliente={clienteForm || null}
        isOpen={isFormOpen}
        onClose={() => setClienteForm(undefined)}
        onSaved={handleSaved}
      />

      <PagoFormModal
        clienteId={clientePago?.id || null}
        clienteNombre={clientePago ? `${clientePago.nombre} ${clientePago.apellido}` : ''}
        isOpen={isPagoOpen}
        onClose={() => setClientePago(null)}
        onSaved={handlePagoSaved}
      />

      <ConfirmModal
        isOpen={!!clienteAEliminar}
        title="Eliminar cliente"
        message={
          clienteAEliminar
            ? `¿Estás seguro de eliminar a ${clienteAEliminar.nombre} ${clienteAEliminar.apellido}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        onConfirm={handleEliminar}
        onCancel={() => setClienteAEliminar(null)}
        loading={eliminando}
      />

      <ClienteCredencialesModal
        clienteId={clienteCredenciales?.id || null}
        clienteNombre={clienteCredenciales ? `${clienteCredenciales.nombre} ${clienteCredenciales.apellido}` : ''}
        isOpen={isCredencialesOpen}
        onClose={() => setClienteCredenciales(null)}
        onSaved={handleCredencialesSaved}
      />
    </div>
  );
}
