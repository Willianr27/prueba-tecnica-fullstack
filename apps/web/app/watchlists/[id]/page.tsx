import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Severity } from '@signal-watcher/shared';
import { ApiClientError, apiFetch } from '@/lib/api-client';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SimulateEventButton } from '@/components/SimulateEventButton';

interface EventRow {
  id: string;
  rawPayload: { type?: string; description?: string; matchedTerm?: string };
  summary: string | null;
  severity: Severity | null;
  suggestedAction: string | null;
  aiProvider: string | null;
  aiLatencyMs: number | null;
  createdAt: string;
}

interface WatchlistDetail {
  id: string;
  name: string;
  terms: string[];
  createdAt: string;
  events: EventRow[];
}

export const dynamic = 'force-dynamic';

export default async function WatchlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let watchlist: WatchlistDetail;
  try {
    watchlist = await apiFetch<WatchlistDetail>(`/api/watchlists/${id}`);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/watchlists" className="text-xs text-white/50 hover:text-white">
            ← Back to watchlists
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{watchlist.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1">
            {watchlist.terms.map((t) => (
              <span key={t} className="rounded bg-black/30 px-2 py-0.5 text-xs text-white/70">
                {t}
              </span>
            ))}
          </div>
        </div>
        <SimulateEventButton watchlistId={watchlist.id} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
          Events ({watchlist.events.length})
        </h2>
        {watchlist.events.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            No events yet. Click <em>Simulate event</em> to generate one.
          </p>
        ) : (
          <ul className="space-y-2">
            {watchlist.events.map((e) => (
              <li key={e.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={e.severity} />
                      <span className="text-xs text-white/50">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                      <span className="text-xs text-white/40">
                        {e.aiProvider ?? 'unknown'}
                        {e.aiLatencyMs != null ? ` · ${e.aiLatencyMs}ms` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{e.summary ?? e.rawPayload.description ?? '—'}</p>
                    {e.suggestedAction && (
                      <p className="mt-1 text-xs text-cyan-300/90">
                        → {e.suggestedAction}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
