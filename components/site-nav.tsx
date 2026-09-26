'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [{ href: '/', label: 'Generate', requiresAuth: false }, { href: '/dashboard', label: 'Saved sets', requiresAuth: true }] as const;

/** Primary nav, unchanged in look from the original header — plain text links, no pill/button styling. */
export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex">
      {links
        .filter((link) => !link.requiresAuth || signedIn)
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? 'page' : undefined}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
    </nav>
  );
}