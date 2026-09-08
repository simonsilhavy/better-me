import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { SessionKeeper } from '@/components/SessionKeeper';
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
          <SessionKeeper />
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
