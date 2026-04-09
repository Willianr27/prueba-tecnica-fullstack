import type { Severity } from '@signal-watcher/shared';
import { SeverityBadge } from '@/components/SeverityBadge';
import { RelativeTime } from '@/components/ui/RelativeTime';

interface EventCardProps {
  severity: Severity | null;
  eventType?: string;
  createdAt: string;
  summary: string | null;
  suggestedAction: string | null;
  provider: string | null;
  latencyMs: number | null;
  cached?: boolean | null;
  fallbackDescription?: string;
}

const BORDER_BY_SEV: Record<Severity | 'NONE', string> = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MED: 'border-l-yellow-500',
  LOW: 'border-l-emerald-500',
  NONE: 'border-l-white/20',
};

export function EventCard({
  severity,
  eventType,
  createdAt,
  summary,
  suggestedAction,
  provider,
  latencyMs,
  cached,
  fallbackDescription,
}: EventCardProps) {
  const sevKey = (severity ?? 'NONE') as keyof typeof BORDER_BY_SEV;
  const prettyType = eventType ? eventType.replace(/_/g, ' ') : null;
  const summaryText = summary ?? fallbackDescription ?? '—';
  const isGemini = provider === 'gemini';

  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-4">
      {/* Header */}
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={severity} />
          {prettyType && (
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-white/70">
              {prettyType}
            </span>
          )}
        </div>
        <RelativeTime date={createdAt} className="text-xs text-white/60" />
      </header>

      {/* AI summary */}
      <div className={`mb-3 border-l-2 pl-3 ${BORDER_BY_SEV[sevKey]}`}>
        <div className="text-xs text-white/60">Resumen de IA</div>
        <p className="mt-0.5 text-sm text-white/90">{summaryText}</p>
      </div>

      {/* Suggested action */}
      {suggestedAction && (
        <div className="mb-3 rounded-md bg-black/30 p-3">
          <div className="text-xs text-white/60">Acción sugerida</div>
          <p className="mt-0.5 text-sm font-medium text-cyan-200">{suggestedAction}</p>
        </div>
      )}

      {/* Metadata footer */}
      <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isGemini ? 'bg-emerald-500' : 'bg-white/40'
            }`}
          />
          <span className="font-medium text-white">
            {provider ?? 'desconocido'}
          </span>
        </span>
        <span className="text-white/30">·</span>
        <span>
          Latencia{' '}
          <span className="font-medium text-white">
            {latencyMs != null ? `${latencyMs}ms` : 'n/d'}
          </span>
        </span>
        <span className="text-white/30">·</span>
        <span>
          Caché <span className="font-medium text-white">{cached ? 'sí' : 'no'}</span>
        </span>
      </footer>
    </article>
  );
}
