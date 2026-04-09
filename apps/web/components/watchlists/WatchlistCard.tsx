import Link from 'next/link';

interface WatchlistCardProps {
  id: string;
  name: string;
  terms: string[];
  eventCount: number;
  severityCounts: Record<string, number>;
}

const SEV_ORDER = ['CRITICAL', 'HIGH', 'MED', 'LOW'] as const;
const SEV_BAR_COLOR: Record<(typeof SEV_ORDER)[number], string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MED: 'bg-yellow-500',
  LOW: 'bg-emerald-500',
};

export function WatchlistCard({
  id,
  name,
  terms,
  eventCount,
  severityCounts,
}: WatchlistCardProps) {
  const critical = severityCounts.CRITICAL ?? 0;
  const visibleTerms = terms.slice(0, 3);
  const extraTerms = Math.max(0, terms.length - 3);

  return (
    <Link
      href={`/watchlists/${id}`}
      className="group block rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:border-cyan-400/50 hover:bg-white/[0.07]"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-white">{name}</h3>
        {critical > 0 && (
          <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
            {critical} crítico{critical === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {visibleTerms.map((t) => (
          <span
            key={t}
            className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/70"
          >
            {t}
          </span>
        ))}
        {extraTerms > 0 && (
          <span className="text-[11px] text-white/40">+{extraTerms} más</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">
          {eventCount} evento{eventCount === 1 ? '' : 's'}
        </span>
        <SeverityMiniBar counts={severityCounts} />
      </div>
    </Link>
  );
}

function SeverityMiniBar({ counts }: { counts: Record<string, number> }) {
  const total = SEV_ORDER.reduce((acc, s) => acc + (counts[s] ?? 0), 0);
  if (total === 0) {
    return <span className="text-[10px] text-white/30">sin eventos</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {SEV_ORDER.map((sev) => {
        const n = counts[sev] ?? 0;
        if (n === 0) return null;
        return (
          <span
            key={sev}
            title={`${sev}: ${n}`}
            className={`h-3 w-1.5 rounded-sm ${SEV_BAR_COLOR[sev]}`}
          />
        );
      })}
    </div>
  );
}
