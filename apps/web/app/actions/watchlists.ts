'use server';

import { revalidatePath } from 'next/cache';
import { CreateWatchlistSchema } from '@signal-watcher/shared';
import { ApiClientError, apiFetch } from '@/lib/api-client';

export interface ActionState {
  ok: boolean;
  message?: string;
}

export async function createWatchlistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const termsRaw = String(formData.get('terms') ?? '').trim();
  const terms = termsRaw
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const parsed = CreateWatchlistSchema.safeParse({ name, terms });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  try {
    await apiFetch('/api/watchlists', { method: 'POST', body: parsed.data });
    revalidatePath('/watchlists');
    return { ok: true, message: 'Lista creada.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof ApiClientError ? err.message : 'No se pudo crear la lista',
    };
  }
}

export async function deleteWatchlistAction(id: string): Promise<void> {
  await apiFetch(`/api/watchlists/${id}`, { method: 'DELETE' });
  revalidatePath('/watchlists');
}

export async function simulateEventAction(watchlistId: string): Promise<void> {
  await apiFetch(`/api/watchlists/${watchlistId}/events/simulate`, { method: 'POST' });
  revalidatePath(`/watchlists/${watchlistId}`);
}
