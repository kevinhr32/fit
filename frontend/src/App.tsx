import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClienteNuevoPage from './pages/ClienteNuevoPage';
import ClientesPage from './pages/ClientesPage';
import EntrenadoresPage from './pages/EntrenadoresPage';
import FinanzasPage from './pages/FinanzasPage';
import ConfiguracionPage from './pages/ConfiguracionPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<ClienteNuevoPage />} />
          <Route path="/entrenadores" element={<EntrenadoresPage />} />
          <Route path="/finanzas" element={<FinanzasPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
