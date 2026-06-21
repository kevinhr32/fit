import { useEffect, useState } from 'react';
import api from '../api/client';
import type { User } from '../types';

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

function decodeBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  );
}

function getRoleFromToken(): User['role'] | null {
  const access = localStorage.getItem('gymnisfit_access');
  if (!access) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(access.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

export default function ConfiguracionPage() {
  const [nombre, setNombre] = useState('');
  const [originalNombre, setOriginalNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<User['role'] | null>(null);

  const isAdmin = role === 'ADMIN';

  const fetchGimnasio = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<{ id: number; nombre: string; creado_en: string }>('gimnasio/');
      setNombre(response.data.nombre);
      setOriginalNombre(response.data.nombre);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRole(getRoleFromToken());
    fetchGimnasio();
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
    </div>
  );
}
