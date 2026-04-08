'use client';

import { useActionState } from 'react';
import { createWatchlistAction, type ActionState } from '@/app/actions/watchlists';

const initialState: ActionState = { ok: false };

export function WatchlistForm() {
  const [state, formAction, pending] = useActionState(createWatchlistAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
        Crear lista de vigilancia
      </h2>
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
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? 'Creando…' : 'Crear'}
        </button>
        {state.message && (
          <span className={state.ok ? 'text-xs text-green-400' : 'text-xs text-red-400'}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
