import { apiFetch } from '@/lib/api-client';
import { WatchlistForm } from '@/components/WatchlistForm';
import { WatchlistCard } from '@/components/watchlists/WatchlistCard';
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

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section>
          <h1 className="mb-4 text-xl font-semibold">Listas de vigilancia</h1>

          {watchlists.length === 0 ? (
            <EmptyState
              iconName="radar"
              title="No hay listas de vigilancia"
              description="Crea tu primera lista para empezar a monitorear señales en tiempo real."
              hint="Usa el formulario de la derecha →"
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

        <aside>
          <WatchlistForm />
        </aside>
      </div>
    </div>
  );
}
