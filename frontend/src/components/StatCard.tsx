interface StatCardProps {
  label: string;
  value: number;
  variant: 'danger' | 'warning' | 'success';
}

const variants = {
  danger: {
    border: 'border-l-danger',
    text: 'text-danger',
    bg: 'bg-white',
  },
  warning: {
    border: 'border-l-warning',
    text: 'text-warning',
    bg: 'bg-white',
  },
  success: {
    border: 'border-l-success',
    text: 'text-success',
    bg: 'bg-white',
  },
};

export default function StatCard({ label, value, variant }: StatCardProps) {
  const v = variants[variant];
  return (
    <div
      className={`${v.bg} rounded-xl p-5 border-l-[6px] ${v.border} shadow-sm`}
    >
      <p className="text-slate text-sm font-medium mb-1">{label}</p>
      <p
        className={`text-4xl md:text-5xl ${v.text}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}
