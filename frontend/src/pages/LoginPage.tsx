import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setTokens } from '../api/client';
import { getRoleFromToken, getDashboardPathForRole } from '../utils/jwt';
import Logo from '../components/Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const glowRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [hoveringCard, setHoveringCard] = useState(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`;
        }
        rafId.current = null;
      });
      setSpotlightActive(true);
    };
    const handleLeave = () => setSpotlightActive(false);

    window.addEventListener('mousemove', handleMove);
    document.documentElement.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

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
      const role = getRoleFromToken();
      const path = role ? getDashboardPathForRole(role) : '/dashboard';
      navigate(path, { replace: true });
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0D13] flex items-center justify-center p-4 overflow-hidden">
      {/* ambient light blobs */}
      <div
        className="login-glow absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-accent/30 blur-[110px]"
        style={{ animation: 'login-drift-a 14s ease-in-out infinite' }}
      />
      <div
        className="login-glow absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full bg-[#FF9E1B]/25 blur-[100px]"
        style={{ animation: 'login-drift-b 18s ease-in-out infinite' }}
      />
      <div
        className="login-glow absolute -bottom-40 left-1/4 w-[460px] h-[460px] rounded-full bg-accent-light/20 blur-[120px]"
        style={{ animation: 'login-drift-c 20s ease-in-out infinite' }}
      />

      {/* spotlight that follows the cursor, fades out over the form card */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full blur-[100px] transition-opacity duration-500 will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(255,158,27,0.35), rgba(255,77,46,0.16) 45%, transparent 72%)',
          opacity: spotlightActive && !hoveringCard ? 1 : 0,
        }}
      />

      <div
        className="relative z-10 w-full max-w-md bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 md:p-10"
        onMouseEnter={() => setHoveringCard(true)}
        onMouseLeave={() => setHoveringCard(false)}
      >
        <div className="flex justify-center mb-8">
          <Logo size="lg" variant="light" />
        </div>

        <h2
          className="text-xl text-bone uppercase tracking-tight text-center mb-6"
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
        >
          Iniciar sesión
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/15 text-danger text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-bone/80 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-bone placeholder-white/30 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              placeholder="admin@gymnisfit.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-bone/80 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-bone placeholder-white/30 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
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
