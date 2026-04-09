interface StatsBarProps {
  stats: {
    totalEvents: number;
    criticalCount: number;
    watchlistCount: number;
    aiProvider: string;
  };
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Eventos totales" value={stats.totalEvents} />
      <StatCard
        label="Críticos"
        value={stats.criticalCount}
        variant={stats.criticalCount > 0 ? 'danger' : 'default'}
      />
      <StatCard label="Listas activas" value={stats.watchlistCount} />
      <StatCard
        label="Proveedor IA"
        value={stats.aiProvider === 'gemini' ? 'Gemini' : 'Mock'}
        variant="success"
      />
    </div>
  );
}

type Variant = 'default' | 'danger' | 'success';

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number | string;
  variant?: Variant;
}) {
  const valueColor =
    variant === 'danger'
      ? 'text-red-400'
      : variant === 'success'
        ? 'text-emerald-400'
        : 'text-white';

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}
