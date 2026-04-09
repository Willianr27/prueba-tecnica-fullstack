import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signal Watcher',
  description: 'Monitor de listas de vigilancia enriquecido con IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
          <SiteFooter />
        </div>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
