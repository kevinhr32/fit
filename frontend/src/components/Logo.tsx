import { Zap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const sizes = {
  sm: { icon: 20, text: 'text-xs tracking-tighter', padding: 'p-1.5', gap: 'gap-1.5' },
  md: { icon: 28, text: 'text-2xl', padding: 'p-2', gap: 'gap-3' },
  lg: { icon: 36, text: 'text-3xl', padding: 'p-2.5', gap: 'gap-3' },
};

const textColors = {
  light: 'text-bone',
  dark: 'text-navy',
};

export default function Logo({ size = 'md', variant = 'light' }: LogoProps) {
  const s = sizes[size];
  const textColor = textColors[variant];
  return (
    <div className={`flex items-center ${s.gap}`}>
      <div
        className={`bg-accent rounded-xl ${s.padding} flex items-center justify-center shadow-sm`}
      >
        <Zap size={s.icon} className="text-white" strokeWidth={2.5} />
      </div>
      <span
        className={`font-archivo uppercase tracking-tight ${textColor} ${s.text}`}
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        GYMNISFIT
      </span>
    </div>
  );
}
