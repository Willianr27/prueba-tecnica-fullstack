import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { WatchlistForm } from '@/components/WatchlistForm';

interface WatchlistListItem {
  id: string;
  name: string;
  terms: string[];
  createdAt: string;
  _count?: { events: number };
}

export const dynamic = 'force-dynamic';

export default async function WatchlistsPage() {
  const watchlists = await apiFetch<WatchlistListItem[]>('/api/watchlists');

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Listas de vigilancia</h1>
        {watchlists.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            Aún no hay listas. Crea la primera →
          </p>
        ) : (
          <ul className="space-y-2">
            {watchlists.map((w) => (
              <li
                key={w.id}
                className="rounded-md border border-white/10 bg-white/5 p-3 hover:border-cyan-400/40"
              >
                <Link href={`/watchlists/${w.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-xs text-white/50">
                      {w._count?.events ?? 0} eventos
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.terms.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-black/30 px-2 py-0.5 text-xs text-white/70"
                      >
                        {t}
                      </span>
                    ))}
                    {w.terms.length > 6 && (
                      <span className="text-xs text-white/40">+{w.terms.length - 6}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside>
        <WatchlistForm />
      </aside>
    </div>
  );
}
