import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import api from '../api/client';
import type { Cliente } from '../types';
import ClienteFormModal from '../components/ClienteFormModal';
import ConfirmModal from '../components/ConfirmModal';

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

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [clienteForm, setClienteForm] = useState<Cliente | null | undefined>(undefined);
  const isFormOpen = clienteForm !== undefined;

  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [renovandoId, setRenovandoId] = useState<number | null>(null);

  const fetchClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Cliente[]>('clientes/');
      setClientes(response.data);
    } catch (err) {
      setError('No se pudo cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

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
        dias: 30,
      });
      setClientes((prev) =>
        prev.map((c) => (c.id === response.data.id ? response.data : c))
      );
    } catch (err) {
      alert('No se pudo renovar la membresía.');
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
                          <button
                            onClick={() => handleRenovar(cliente.id)}
                            disabled={renovandoId === cliente.id}
                            className="inline-flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                          >
                            <RefreshCw size={14} className={renovandoId === cliente.id ? 'animate-spin' : ''} />
                            {renovandoId === cliente.id ? 'Renovando' : 'Renovar 30 días'}
                          </button>
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
    </div>
  );
}
