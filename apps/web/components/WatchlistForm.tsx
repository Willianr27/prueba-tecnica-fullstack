'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createWatchlistAction, type ActionState } from '@/app/actions/watchlists';

const initialState: ActionState = { ok: false };

interface WatchlistFormProps {
  onSuccess?: () => void;
  /** If true, renders without the outer card wrapper (for use inside a Dialog) */
  bare?: boolean;
}

export function WatchlistForm({ onSuccess, bare = false }: WatchlistFormProps) {
  const [state, formAction, pending] = useActionState(createWatchlistAction, initialState);
  const lastMessageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.message && state.message !== lastMessageRef.current) {
      lastMessageRef.current = state.message;
      if (state.ok) {
        toast.success('Lista creada correctamente');
        onSuccess?.();
      } else {
        toast.error('No se pudo crear la lista', { description: state.message });
      }
    }
  }, [state, onSuccess]);

  const wrapperClass = bare
    ? 'space-y-3'
    : 'space-y-3 rounded-lg border border-white/10 bg-white/5 p-4';

  return (
    <form action={formAction} className={wrapperClass}>
      {!bare && (
        <h2 className="text-sm font-medium text-white/80">Crear lista de vigilancia</h2>
      )}
      <div>
        <label className="mb-1 block text-xs text-white/60" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="Marca Acme"
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/60" htmlFor="terms">
          Términos (uno por línea o separados por comas)
        </label>
        <textarea
          id="terms"
          name="terms"
          required
          rows={3}
          placeholder={'acme-corp\nacme.com\nacme-login'}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </div>
      <div className="flex items-center justify-end pt-1">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-transparent px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          {pending ? 'Creando…' : 'Crear lista'}
        </button>
      </div>
    </form>
  );
}
