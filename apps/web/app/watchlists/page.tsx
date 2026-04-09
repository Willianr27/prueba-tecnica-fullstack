import { apiFetch } from '@/lib/api-client';
import { WatchlistCard } from '@/components/watchlists/WatchlistCard';
import { NewWatchlistButton } from '@/components/watchlists/NewWatchlistButton';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { EmptyState } from '@/components/ui/EmptyState';

interface WatchlistListItem {
  id: string;
  name: string;
  terms: string[];
  createdAt: string;
  _count?: { events: number };
  severityCounts?: Record<string, number>;
}

interface Stats {
  totalEvents: number;
  criticalCount: number;
  highCount: number;
  medCount: number;
  lowCount: number;
  watchlistCount: number;
  aiProvider: string;
}

export const dynamic = 'force-dynamic';

export default async function WatchlistsPage() {
  const [watchlists, stats] = await Promise.all([
    apiFetch<WatchlistListItem[]>('/api/watchlists'),
    apiFetch<Stats>('/api/stats').catch(
      (): Stats => ({
        totalEvents: 0,
        criticalCount: 0,
        highCount: 0,
        medCount: 0,
        lowCount: 0,
        watchlistCount: 0,
        aiProvider: 'mock',
      }),
    ),
  ]);

  return (
    <div className="space-y-6">
      <StatsBar stats={stats} />

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Listas de vigilancia</h1>
          <NewWatchlistButton />
        </div>

        {watchlists.length === 0 ? (
          <EmptyState
            iconName="radar"
            title="No hay listas de vigilancia"
            description="Crea tu primera lista para empezar a monitorear señales en tiempo real."
            action={<NewWatchlistButton variant="primary" label="+ Crear lista" />}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {watchlists.map((w) => (
              <WatchlistCard
                key={w.id}
                id={w.id}
                name={w.name}
                terms={w.terms}
                eventCount={w._count?.events ?? 0}
                severityCounts={w.severityCounts ?? {}}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
