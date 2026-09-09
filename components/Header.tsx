'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';

export function Header() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <header className="mb-5 flex items-center justify-between">
      <Link href="/" className="text-lg font-bold tracking-tight">
        Better<span style={{ color: 'var(--accent)' }}>Me</span>
      </Link>
      <nav className="flex gap-2 text-sm">
        <Link href="/" className="bm-seg rounded-lg px-3 py-1.5">
          Dnes
        </Link>
        <Link href="/historie" className="bm-seg rounded-lg px-3 py-1.5">
          Historie
        </Link>
        <Link href="/nastaveni" className="bm-seg rounded-lg px-3 py-1.5">
          Úpravy
        </Link>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Odhlásit"
            title="Odhlásit"
            className="bm-seg cursor-pointer rounded-lg px-3 py-1.5"
          >
            ⏻
          </button>
        </form>
      </nav>
    </header>
  );
}
