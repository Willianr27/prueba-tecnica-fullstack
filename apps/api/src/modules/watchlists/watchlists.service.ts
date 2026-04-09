import type { CreateWatchlistInput } from '@signal-watcher/shared';
import { NotFoundError } from '../../core/errors.js';
import { prisma } from '../../core/prisma.js';

export const watchlistsService = {
  async create(input: CreateWatchlistInput) {
    return prisma.watchlist.create({
      data: { name: input.name, terms: input.terms },
    });
  },

  async list() {
    const watchlists = await prisma.watchlist.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { events: true } } },
    });

    // Group severity counts per watchlist in a single query
    const grouped = await prisma.event.groupBy({
      by: ['watchlistId', 'severity'],
      _count: { _all: true },
    });

    const bySeverity = new Map<string, Record<string, number>>();
    for (const row of grouped) {
      const key = row.watchlistId;
      if (!bySeverity.has(key)) bySeverity.set(key, {});
      const sev = row.severity ?? 'NONE';
      bySeverity.get(key)![sev] = row._count._all;
    }

    return watchlists.map((w) => ({
      ...w,
      severityCounts: bySeverity.get(w.id) ?? {},
    }));
  },

  async stats() {
    const [watchlistCount, totalEvents, grouped] = await Promise.all([
      prisma.watchlist.count(),
      prisma.event.count(),
      prisma.event.groupBy({
        by: ['severity'],
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MED: 0,
      LOW: 0,
    };
    for (const row of grouped) {
      const sev = row.severity ?? 'NONE';
      counts[sev] = row._count._all;
    }

    return {
      watchlistCount,
      totalEvents,
      criticalCount: counts.CRITICAL ?? 0,
      highCount: counts.HIGH ?? 0,
      medCount: counts.MED ?? 0,
      lowCount: counts.LOW ?? 0,
    };
  },

  async getById(id: string) {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!watchlist) throw NotFoundError('Watchlist');
    return watchlist;
  },

  async delete(id: string) {
    try {
      await prisma.watchlist.delete({ where: { id } });
    } catch {
      throw NotFoundError('Watchlist');
    }
  },
};
