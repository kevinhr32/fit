import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setTokens } from '../api/client';
import Logo from '../components/Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('auth/login/', { email, password });
      setTokens({
        access: response.data.access,
        refresh: response.data.refresh,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 md:p-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" variant="dark" />
        </div>

        <h2
          className="text-xl text-navy uppercase tracking-tight text-center mb-6"
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
        >
          Iniciar sesión
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-navy mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              placeholder="admin@gymnisfit.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-navy mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate/30 bg-white text-navy placeholder-slate/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-light disabled:bg-accent-light/70 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
