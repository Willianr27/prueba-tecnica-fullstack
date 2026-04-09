import Link from 'next/link';

const REPO_URL = 'https://github.com/Willianr27/prueba-tecnica-fullstack';

const STACK = [
  'Next.js 15',
  'Fastify',
  'Prisma',
  'PostgreSQL',
  'Redis',
  'Gemini AI',
  'Tailwind',
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0a0e1a]/60">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          {/* Brand + description */}
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-sm font-semibold tracking-tight text-white">
                Signal Watcher
              </span>
            </div>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/50">
              Monitor de listas de vigilancia con enriquecimiento de IA. Detecta,
              clasifica y sugiere acciones sobre señales relevantes en tiempo real.
            </p>
          </div>

          {/* Stack */}
          <div>
            <div className="text-xs font-medium text-white/80">Stack</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <div className="text-xs font-medium text-white/80">Recursos</div>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li>
                <Link
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
                  </svg>
                  Código fuente
                </Link>
              </li>
              <li>
                <Link
                  href={`${REPO_URL}#readme`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  Documentación
                </Link>
              </li>
              <li>
                <Link
                  href={`${REPO_URL}/tree/main/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  ADRs y Runbook
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-4 text-[11px] text-white/40 sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} Signal Watcher — Prueba técnica full-stack
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            API y frontend desplegados
          </span>
        </div>
      </div>
    </footer>
  );
}
