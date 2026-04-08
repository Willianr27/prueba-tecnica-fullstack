import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signal Watcher',
  description: 'AI-enriched watchlist monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-white/10 bg-black/20 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <a href="/watchlists" className="text-lg font-semibold tracking-tight">
                <span className="text-cyan-400">●</span> Signal Watcher
              </a>
              <span className="text-xs text-white/60">AI-first demo</span>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
