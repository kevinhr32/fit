import { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const sizes = {
  sm: { icon: 32, text: 'text-xs tracking-tighter', gap: 'gap-1.5' },
  md: { icon: 42, text: 'text-2xl', gap: 'gap-2.5' },
  lg: { icon: 54, text: 'text-3xl', gap: 'gap-3' },
};

const textColors = {
  light: 'text-bone',
  dark: 'text-navy',
};

export default function Logo({ size = 'md', variant = 'light' }: LogoProps) {
  const s = sizes[size];
  const textColor = textColors[variant];
  const gradientId = useId();
  return (
    <div className={`flex items-center ${s.gap}`}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF4D2E" />
            <stop offset="1" stopColor="#FF9E1B" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
        <g transform="rotate(-45 32 32)" fill="#FFFFFF">
          <rect x="16" y="29" width="32" height="6" rx="3" />
          <rect x="12" y="21" width="7" height="22" rx="3" />
          <rect x="21" y="24" width="6" height="16" rx="2.5" />
          <rect x="37" y="24" width="6" height="16" rx="2.5" />
          <rect x="45" y="21" width="7" height="22" rx="3" />
        </g>
      </svg>
      <span
        className={`font-archivo uppercase tracking-tight ${textColor} ${s.text}`}
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        GYMNIS<span className="text-accent">FIT</span>
      </span>
    </div>
  );
}
