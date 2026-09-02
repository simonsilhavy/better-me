import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Better Me',
  description: 'Denní tracker — energie, kliky, dřepy, verdikt.',
};

export const viewport: Viewport = {
  themeColor: '#0e0f13',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-xl px-4 py-5">
          <header className="mb-5 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Better<span style={{ color: 'var(--accent)' }}>Me</span>
            </Link>
            <nav className="flex gap-2 text-sm">
              <Link href="/" className="bm-seg rounded-lg px-3 py-1.5">
                Dnes
              </Link>
              <Link href="/history" className="bm-seg rounded-lg px-3 py-1.5">
                Historie
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
