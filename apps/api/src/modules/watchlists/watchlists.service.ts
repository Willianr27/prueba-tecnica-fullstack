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
    return prisma.watchlist.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { events: true } } },
    });
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
