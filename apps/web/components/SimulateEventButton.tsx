'use client';

import { useTransition } from 'react';
import { simulateEventAction } from '@/app/actions/watchlists';

export function SimulateEventButton({ watchlistId }: { watchlistId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => simulateEventAction(watchlistId))}
      disabled={pending}
      className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-cyan-400 disabled:opacity-50"
    >
      {pending ? 'Simulando…' : 'Simular evento'}
    </button>
  );
}
