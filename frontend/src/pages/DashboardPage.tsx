import { useEffect, useState } from 'react';
import api from '../api/client';
import type { DashboardData, PlanMembresia } from '../types';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import ClienteCard from '../components/ClienteCard';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, planesRes] = await Promise.all([
        api.get<DashboardData>('dashboard/'),
        api.get<PlanMembresia[]>('planes-membresia/'),
      ]);
      setData(dashboardRes.data);
      setPlanes(planesRes.data.filter((p) => p.activo));
    } catch (err) {
      setError('No se pudo cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRenovar = (clienteActualizado: DashboardData['alertas'][number]) => {
    setData((prev) => {
      if (!prev) return prev;
      const nuevasAlertas = prev.alertas
        .map((c) => (c.id === clienteActualizado.id ? clienteActualizado : c))
        .filter((c) => c.estado !== 'ACTIVO');
      return {
        ...prev,
        total_activos: prev.total_activos + 1,
        total_vencidos:
          clienteActualizado.estado === 'ACTIVO' && prev.total_vencidos > 0
            ? Math.max(0, prev.total_vencidos - 1)
            : prev.total_vencidos,
        total_por_vencer:
          clienteActualizado.estado === 'ACTIVO' && prev.total_por_vencer > 0
            ? Math.max(0, prev.total_por_vencer - 1)
            : prev.total_por_vencer,
        alertas: nuevasAlertas,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate">Cargando dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-danger">{error || 'Error inesperado'}</p>
        <button
          onClick={fetchDashboard}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <Header gymName={data.gimnasio.nombre} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <StatCard label="Vencidos" value={data.total_vencidos} variant="danger" />
        <StatCard label="Por vencer" value={data.total_por_vencer} variant="warning" />
        <StatCard label="Activos" value={data.total_activos} variant="success" />
      </section>

      <section>
        <h2
          className="text-lg text-navy uppercase tracking-tight mb-4"
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
        >
          Clientes con alertas
        </h2>

        {data.alertas.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-slate">No hay clientes vencidos ni por vencer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.alertas.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                gymName={data.gimnasio.nombre}
                planes={planes}
                onRenovar={handleRenovar}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
