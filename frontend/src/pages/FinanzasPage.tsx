import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import type { FinanzasData, Pago, PaginatedResponse } from '../types';

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
  return 'No se pudo cargar la información financiera.';
}

function formatearPesos(valor: number | string) {
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (Number.isNaN(numero)) return '$ 0';
  return `$ ${numero.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatearFecha(fecha: string) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const METODO_BADGES: Record<string, string> = {
  EFECTIVO: 'bg-success/10 text-success border-success/20',
  TRANSFERENCIA: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  TARJETA: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  NEQUI_DAVIPLATA: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  BREB: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  NEQUI_DAVIPLATA: 'Nequi / Daviplata',
  BREB: 'BRE-B',
};

const PAGE_SIZE = 15;

function getRangoAnios(anioActual: number) {
  return Array.from({ length: 5 }, (_, i) => anioActual - i);
}

export default function FinanzasPage() {
  const [data, setData] = useState<FinanzasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [exportando, setExportando] = useState(false);

  const [vistaPagos, setVistaPagos] = useState<'ultimos' | 'todos'>('ultimos');
  const [todosPagos, setTodosPagos] = useState<Pago[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargandoTodos, setCargandoTodos] = useState(false);
  const [errorTodos, setErrorTodos] = useState('');

  const fetchFinanzas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<FinanzasData>('finanzas/');
      setData(response.data);
      setMes(response.data.mes_actual);
      setAnio(response.data.anio_actual);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTodosPagos = async (page: number) => {
    setCargandoTodos(true);
    setErrorTodos('');
    try {
      const response = await api.get<PaginatedResponse<Pago>>('pagos/', {
        params: { page, page_size: PAGE_SIZE },
      });
      setTodosPagos(response.data.results);
      setTotalPaginas(Math.ceil(response.data.count / PAGE_SIZE));
      setPaginaActual(page);
    } catch (err) {
      setErrorTodos(formatApiError(err));
    } finally {
      setCargandoTodos(false);
    }
  };

  useEffect(() => {
    fetchFinanzas();
  }, []);

  useEffect(() => {
    if (vistaPagos === 'todos') {
      fetchTodosPagos(1);
    }
  }, [vistaPagos]);

  const aniosDisponibles = useMemo(() => {
    return data?.rango_anios || getRangoAnios(new Date().getFullYear());
  }, [data]);

  const handleExportarPDF = async () => {
    setExportando(true);
    try {
      const response = await api.get('finanzas/exportar-pdf/', {
        params: { año: anio, mes },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-pagos-${anio}-${String(mes).padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          alert(json.detail || 'No se pudo generar el PDF.');
        } catch {
          alert('No se pudo generar el PDF.');
        }
      } else {
        alert('No se pudo generar el PDF.');
      }
    } finally {
      setExportando(false);
    }
  };

  const pagosAMostrar: Pago[] = vistaPagos === 'ultimos' ? data?.ultimos_pagos || [] : todosPagos;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate">Cargando finanzas...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-danger">{error || 'Error inesperado'}</p>
        <button
          onClick={fetchFinanzas}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const hayDatos = data.total_historico > 0;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <h1
          className="text-2xl text-navy uppercase tracking-tight"
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
        >
          Finanzas
        </h1>

        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-lg border border-slate/30 bg-white text-navy text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            >
              {MESES.map((nombre, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-lg border border-slate/30 bg-white text-navy text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportarPDF}
            disabled={exportando}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={16} />
            {exportando ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-xl p-5 border-l-[6px] border-l-accent shadow-sm">
          <p className="text-slate text-sm font-medium mb-1">Total del mes</p>
          <p
            className="text-4xl md:text-5xl text-accent"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {formatearPesos(data.total_mes)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border-l-[6px] border-l-success shadow-sm">
          <p className="text-slate text-sm font-medium mb-1">Total histórico</p>
          <p
            className="text-4xl md:text-5xl text-success"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {formatearPesos(data.total_historico)}
          </p>
        </div>
      </div>

      {!hayDatos ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-slate text-lg">No hay pagos registrados.</p>
          <p className="text-slate/70 text-sm mt-2">
            Los ingresos y estadísticas aparecerán cuando registres el primer pago.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2
              className="text-lg text-navy uppercase tracking-tight mb-6"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              Ingresos mensuales
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ingresos_mensuales} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      const num = typeof value === 'number' ? value : 0;
                      return `$${(num / 1000).toFixed(0)}k`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value) => {
                      const num = typeof value === 'number' ? value : 0;
                      return [formatearPesos(num), 'Ingresos'];
                    }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {data.ingresos_mensuales.map((_, idx) => (
                      <Cell key={idx} fill="#FF4D2E" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2
                className="text-lg text-navy uppercase tracking-tight mb-6"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                Distribución por método de pago
              </h2>
              <div className="flex flex-col items-center gap-6">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.metodos_data}
                        dataKey="porcentaje"
                        nameKey="metodo_display"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {data.metodos_data.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(_value, _name, props) => {
                          const item = props?.payload as (typeof data.metodos_data)[number] | undefined;
                          if (!item) return ['', ''];
                          return [`${item.porcentaje}% (${formatearPesos(item.total)})`, item.metodo_display];
                        }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {data.metodos_data.map((m) => (
                    <div key={m.metodo} className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="text-sm text-navy flex-1">{m.metodo_display}</span>
                      <span className="text-sm font-medium text-navy">{m.porcentaje}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2
                className="text-lg text-navy uppercase tracking-tight mb-6"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                Desglose por método de pago
              </h2>
              <div className="space-y-5">
                {data.metodos_data.map((m) => (
                  <div key={m.metodo}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-navy">{m.metodo_display}</span>
                      <span className="text-slate">{formatearPesos(m.total)}</span>
                    </div>
                    <div className="w-full bg-slate/10 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(m.porcentaje, 100)}%`, backgroundColor: m.color }}
                      />
                    </div>
                    <p className="text-xs text-slate mt-0.5">{m.porcentaje}% del total</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2
                className="text-lg text-navy uppercase tracking-tight"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                Pagos
              </h2>
              <div className="flex items-center gap-1 bg-bone rounded-lg p-1">
                <button
                  onClick={() => setVistaPagos('ultimos')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    vistaPagos === 'ultimos'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-slate hover:text-navy'
                  }`}
                >
                  Últimos pagos
                </button>
                <button
                  onClick={() => setVistaPagos('todos')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    vistaPagos === 'todos'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-slate hover:text-navy'
                  }`}
                >
                  Todos los pagos
                </button>
              </div>
            </div>

            {errorTodos && (
              <div className="px-6 pb-4">
                <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
                  {errorTodos}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-navy text-bone">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Cliente</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Monto</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Método de pago</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/10">
                  {cargandoTodos ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate">
                        Cargando pagos...
                      </td>
                    </tr>
                  ) : pagosAMostrar.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate">
                        No hay pagos para mostrar.
                      </td>
                    </tr>
                  ) : (
                    pagosAMostrar.map((pago: Pago) => (
                      <tr key={pago.id} className="hover:bg-bone/50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-navy">{pago.cliente_nombre}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-success">{formatearPesos(pago.monto)}</td>
                        <td className="px-5 py-4 text-slate text-sm">{formatearFecha(pago.fecha_pago)}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                              METODO_BADGES[pago.metodo_pago] || 'bg-slate/10 text-slate border-slate/20'
                            }`}
                          >
                            {METODO_LABELS[pago.metodo_pago] || pago.metodo_pago}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate text-sm">{pago.referencia || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {vistaPagos === 'todos' && totalPaginas > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate/10">
                <button
                  onClick={() => fetchTodosPagos(paginaActual - 1)}
                  disabled={paginaActual <= 1 || cargandoTodos}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate/30 text-navy text-sm font-medium hover:bg-slate/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <span className="text-sm text-slate">
                  Página <span className="font-medium text-navy">{paginaActual}</span> de{' '}
                  <span className="font-medium text-navy">{totalPaginas}</span>
                </span>
                <button
                  onClick={() => fetchTodosPagos(paginaActual + 1)}
                  disabled={paginaActual >= totalPaginas || cargandoTodos}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate/30 text-navy text-sm font-medium hover:bg-slate/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
