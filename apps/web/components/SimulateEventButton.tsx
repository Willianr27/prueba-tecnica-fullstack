'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { simulateEventAction } from '@/app/actions/watchlists';

export function SimulateEventButton({ watchlistId }: { watchlistId: string }) {
  const [pending, start] = useTransition();

  const handleClick = () => {
    start(async () => {
      const result = await simulateEventAction(watchlistId);
      if (result.ok) {
        const sev = result.severity ?? 'desconocida';
        toast.success(`Evento simulado — ${sev}`, {
          description: result.summary
            ? result.summary.length > 90
              ? result.summary.slice(0, 90) + '…'
              : result.summary
            : undefined,
        });
      } else {
        toast.error('Error al simular evento', {
          description: result.message ?? 'El servicio no está disponible. Intenta de nuevo.',
        });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-cyan-400 disabled:opacity-50"
    >
      {pending ? 'Simulando…' : 'Simular evento'}
    </button>
  );
}
