'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { WatchlistForm } from '@/components/WatchlistForm';

interface NewWatchlistButtonProps {
  /** Variant for how the trigger is styled. */
  variant?: 'outline' | 'primary';
  label?: string;
}

export function NewWatchlistButton({
  variant = 'outline',
  label = '+ Nueva lista',
}: NewWatchlistButtonProps) {
  const [open, setOpen] = useState(false);

  const triggerClass =
    variant === 'primary'
      ? 'inline-flex items-center gap-1 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-cyan-400'
      : 'inline-flex items-center gap-1 rounded-md border border-white/15 bg-transparent px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear lista de vigilancia"
        description="Define un nombre y los términos a monitorear."
      >
        <WatchlistForm bare onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
