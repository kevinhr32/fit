import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import EntrenadorLayout from './components/EntrenadorLayout';
import ClienteLayout from './components/ClienteLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClienteNuevoPage from './pages/ClienteNuevoPage';
import ClientesPage from './pages/ClientesPage';
import EntrenadoresPage from './pages/EntrenadoresPage';
import FinanzasPage from './pages/FinanzasPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import EntrenadorDashboardPage from './pages/entrenador/EntrenadorDashboardPage';
import ClasesDisponiblesPage from './pages/cliente/ClasesDisponiblesPage';
import MisReservasPage from './pages/cliente/MisReservasPage';
import MiMembresiaPage from './pages/cliente/MiMembresiaPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas ADMIN */}
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<ClienteNuevoPage />} />
          <Route path="/entrenadores" element={<EntrenadoresPage />} />
          <Route path="/finanzas" element={<FinanzasPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Route>

      {/* Rutas ENTRENADOR */}
      <Route element={<ProtectedRoute roles={['ENTRENADOR']} />}>
        <Route element={<EntrenadorLayout />}>
          <Route path="/entrenador/dashboard" element={<EntrenadorDashboardPage />} />
        </Route>
      </Route>

      {/* Rutas CLIENTE */}
      <Route element={<ProtectedRoute roles={['CLIENTE']} />}>
        <Route element={<ClienteLayout />}>
          <Route path="/cliente/clases" element={<ClasesDisponiblesPage />} />
          <Route path="/cliente/reservas" element={<MisReservasPage />} />
          <Route path="/cliente/membresia" element={<MiMembresiaPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
