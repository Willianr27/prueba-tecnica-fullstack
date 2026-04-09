import { notFound } from 'next/navigation';
import type { Severity } from '@signal-watcher/shared';
import { ApiClientError, apiFetch } from '@/lib/api-client';
import { SimulateEventButton } from '@/components/SimulateEventButton';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackLink } from '@/components/ui/BackLink';

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <BackLink href="/watchlists" label="Volver a las listas" />
          <h1 className="mt-3 text-2xl font-semibold">{watchlist.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {watchlist.terms.map((t) => (
              <span
                key={t}
                className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <SimulateEventButton watchlistId={watchlist.id} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white/80">
          Eventos ({watchlist.events.length})
        </h2>
        {watchlist.events.length === 0 ? (
          <EmptyState
            iconName="inbox"
            title="Sin eventos aún"
            description="Simula un evento para ver el enriquecimiento de IA en acción."
            action={<SimulateEventButton watchlistId={watchlist.id} />}
          />
        ) : (
          <div className="grid gap-3">
            {watchlist.events.map((e) => (
              <EventCard
                key={e.id}
                severity={e.severity}
                eventType={e.rawPayload.type}
                createdAt={e.createdAt}
                summary={e.summary}
                suggestedAction={e.suggestedAction}
                provider={e.aiProvider}
                latencyMs={e.aiLatencyMs}
                fallbackDescription={e.rawPayload.description}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
