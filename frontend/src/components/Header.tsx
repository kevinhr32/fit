import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface HeaderProps {
  gymName: string;
}

export default function Header({ gymName }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between mb-8">
      <h1
        className="text-2xl md:text-3xl text-navy uppercase tracking-tight"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        {gymName}
      </h1>

      <button
        onClick={() => navigate('/clientes/nuevo')}
        className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        Agregar Cliente
      </button>
    </header>
  );
}
