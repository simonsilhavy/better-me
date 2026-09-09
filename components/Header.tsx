'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';

const LINKS = [
  { href: '/', label: 'Dnes' },
  { href: '/historie', label: 'Historie' },
  { href: '/denik', label: 'Deník' },
  { href: '/prehled', label: 'Přehled' },
  { href: '/nastaveni', label: 'Úpravy' },
];

/**
 * Two rows on purpose. Five destinations plus the logo and the logout stopped
 * fitting one line on a phone, and letting them wrap put the logout button
 * underneath the links, where it is easy to hit by accident. Giving the links
 * their own row keeps that button in its corner, and the row scrolls sideways
 * if more are ever added.
 */
export function Header() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="mb-5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Better<span style={{ color: 'var(--accent)' }}>Me</span>
        </Link>
        <LogoutButton />
      </div>

      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className="bm-seg bm-nav bm-press shrink-0 rounded-lg px-3 py-1.5"
              style={
                active
                  ? { background: 'var(--accent)', color: '#0e0f13', fontWeight: 600 }
                  : undefined
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
