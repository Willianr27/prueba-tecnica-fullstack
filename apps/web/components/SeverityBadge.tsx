import type { Severity } from '@signal-watcher/shared';

const styles: Record<Severity | 'NONE', string> = {
  LOW: 'bg-green-500/15 text-green-300 border-green-500/30',
  MED: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-500/30',
  NONE: 'bg-white/5 text-white/60 border-white/10',
};

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  const key = (severity ?? 'NONE') as keyof typeof styles;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[key]}`}
    >
      {severity ?? '—'}
    </span>
  );
}
