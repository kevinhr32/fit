import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import type { PlanMembresia, User } from '../types';
import { getRoleFromToken } from '../utils/jwt';
import ConfirmModal from '../components/ConfirmModal';

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
  return 'No se pudo guardar la configuración.';
}

export default function ConfiguracionPage() {
  const [nombre, setNombre] = useState('');
  const [originalNombre, setOriginalNombre] = useState('');
  const [feedHabilitado, setFeedHabilitado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFeed, setSavingFeed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<User['role'] | null>(null);

  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorPlanes, setErrorPlanes] = useState('');
  const [nuevoPlanNombre, setNuevoPlanNombre] = useState('');
  const [nuevoPlanDias, setNuevoPlanDias] = useState('');
  const [agregandoPlan, setAgregandoPlan] = useState(false);
  const [planAEliminar, setPlanAEliminar] = useState<PlanMembresia | null>(null);
  const [eliminandoPlan, setEliminandoPlan] = useState(false);

  const isAdmin = role === 'ADMIN';

  const fetchGimnasio = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<{ id: number; nombre: string; feed_habilitado: boolean; creado_en: string }>('gimnasio/');
      setNombre(response.data.nombre);
      setOriginalNombre(response.data.nombre);
      setFeedHabilitado(response.data.feed_habilitado);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanes = async () => {
    setLoadingPlanes(true);
    setErrorPlanes('');
    try {
      const response = await api.get<PlanMembresia[]>('planes-membresia/');
      setPlanes(response.data);
    } catch (err) {
      setErrorPlanes(formatApiError(err));
    } finally {
      setLoadingPlanes(false);
    }
  };

  const handleAgregarPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const dias = parseInt(nuevoPlanDias, 10);
    if (!dias || dias < 1) return;

    setAgregandoPlan(true);
    setErrorPlanes('');
    try {
      const response = await api.post<PlanMembresia>('planes-membresia/', {
        nombre: nuevoPlanNombre.trim(),
        dias,
      });
      setPlanes((prev) => [...prev, response.data].sort((a, b) => a.dias - b.dias));
      setNuevoPlanNombre('');
      setNuevoPlanDias('');
    } catch (err) {
      setErrorPlanes(formatApiError(err));
    } finally {
      setAgregandoPlan(false);
    }
  };

  const handleToggleActivoPlan = async (plan: PlanMembresia) => {
    try {
      const response = await api.patch<PlanMembresia>(`planes-membresia/${plan.id}/`, {
        activo: !plan.activo,
      });
      setPlanes((prev) => prev.map((p) => (p.id === plan.id ? response.data : p)));
    } catch (err) {
      setErrorPlanes(formatApiError(err));
    }
  };

  const handleEliminarPlan = async () => {
    if (!planAEliminar) return;
    setEliminandoPlan(true);
    try {
      await api.delete(`planes-membresia/${planAEliminar.id}/`);
      setPlanes((prev) => prev.filter((p) => p.id !== planAEliminar.id));
      setPlanAEliminar(null);
    } catch (err) {
      setErrorPlanes(formatApiError(err));
    } finally {
      setEliminandoPlan(false);
    }
  };

  const handleToggleFeed = async () => {
    if (!isAdmin || savingFeed) return;
    const nuevoValor = !feedHabilitado;
    setSavingFeed(true);
    try {
      const response = await api.patch('gimnasio/', { feed_habilitado: nuevoValor });
      setFeedHabilitado(response.data.feed_habilitado);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSavingFeed(false);
    }
  };

  useEffect(() => {
    setRole(getRoleFromToken());
    fetchGimnasio();
    fetchPlanes();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || nombre === originalNombre) return;

    setError('');
    setSaving(true);

    try {
      const response = await api.patch('gimnasio/', { nombre });
      setOriginalNombre(response.data.nombre);
      setNombre(response.data.nombre);
      setSuccess(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl text-navy uppercase tracking-tight mb-6"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Configuración
      </h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        {success && (
          <div className="mb-5 p-3 rounded-lg bg-success/10 text-success text-sm">
            Configuración guardada correctamente.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger/10 text-danger text-sm">
            {error}
          </div>
        )}

        {!isAdmin && role && (
          <div className="mb-5 p-3 rounded-lg bg-warning/10 text-warning text-sm">
            Solo el administrador puede editar la configuración del gimnasio.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-navy mb-1">
              Nombre del gimnasio
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              readOnly={!isAdmin}
              required
              className={`w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder:text-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors ${
                !isAdmin ? 'bg-slate/5 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isAdmin || saving || nombre === originalNombre || !nombre.trim()}
              className="bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-navy font-medium">Feed de comunidad</p>
            <p className="text-slate text-sm mt-1 max-w-md">
              Muestra a tus clientes un feed con los logros y retos completados de todo el
              gimnasio. Si tu gimnasio no busca una cultura social, déjalo desactivado.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleFeed}
            disabled={!isAdmin || savingFeed}
            aria-pressed={feedHabilitado}
            className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              feedHabilitado ? 'bg-accent' : 'bg-slate/30'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                feedHabilitado ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mt-6">
        <p className="text-navy font-medium">Planes de membresía</p>
        <p className="text-slate text-sm mt-1 max-w-md">
          Duraciones disponibles para altas y renovaciones de clientes (ej: Mensual/30
          días). Desactiva un plan para dejar de ofrecerlo sin borrar el historial de
          clientes que ya lo usaron.
        </p>

        {errorPlanes && (
          <div className="mt-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
            {errorPlanes}
          </div>
        )}

        {loadingPlanes ? (
          <p className="text-slate text-sm mt-4">Cargando planes...</p>
        ) : (
          <div className="mt-4 divide-y divide-slate/10">
            {planes.length === 0 && (
              <p className="text-slate text-sm py-3">Todavía no hay planes configurados.</p>
            )}
            {planes.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-navy font-medium text-sm">
                    {plan.nombre || `${plan.dias} días`}
                  </p>
                  <p className="text-slate text-xs">{plan.dias} días</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => isAdmin && handleToggleActivoPlan(plan)}
                    disabled={!isAdmin}
                    aria-pressed={plan.activo}
                    title={plan.activo ? 'Activo (clic para desactivar)' : 'Inactivo (clic para activar)'}
                    className={`shrink-0 relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.activo ? 'bg-accent' : 'bg-slate/30'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        plan.activo ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setPlanAEliminar(plan)}
                      className="p-1.5 text-slate hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Eliminar plan"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <form onSubmit={handleAgregarPlan} className="flex flex-wrap items-end gap-3 mt-5 pt-5 border-t border-slate/10">
            <div>
              <label htmlFor="nuevo-plan-nombre" className="block text-xs font-medium text-navy mb-1">
                Nombre (opcional)
              </label>
              <input
                id="nuevo-plan-nombre"
                type="text"
                value={nuevoPlanNombre}
                onChange={(e) => setNuevoPlanNombre(e.target.value)}
                placeholder="Ej: Semestral"
                className="w-40 px-3 py-2 rounded-lg border border-slate/30 bg-white text-navy text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="nuevo-plan-dias" className="block text-xs font-medium text-navy mb-1">
                Días
              </label>
              <input
                id="nuevo-plan-dias"
                type="number"
                min={1}
                value={nuevoPlanDias}
                onChange={(e) => setNuevoPlanDias(e.target.value)}
                placeholder="Ej: 365"
                required
                className="w-28 px-3 py-2 rounded-lg border border-slate/30 bg-white text-navy text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={agregandoPlan || !nuevoPlanDias}
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              {agregandoPlan ? 'Agregando...' : 'Agregar plan'}
            </button>
          </form>
        )}
      </div>

      <ConfirmModal
        isOpen={!!planAEliminar}
        title="Eliminar plan"
        message={
          planAEliminar
            ? `¿Eliminar el plan "${planAEliminar.nombre || `${planAEliminar.dias} días`}"? Ya no podrá usarse para altas ni renovaciones.`
            : ''
        }
        confirmText="Eliminar"
        onConfirm={handleEliminarPlan}
        onCancel={() => setPlanAEliminar(null)}
        loading={eliminandoPlan}
      />
    </div>
  );
}
