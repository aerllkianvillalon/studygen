import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { CONTACT_URL, SITE_TAGLINE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo showMark={false} />
          <p className="mt-1 max-w-xs">{SITE_TAGLINE}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/" className="transition-colors hover:text-foreground">
            Generate
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Saved sets
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            Contact
            <ExternalLinkIcon className="size-3" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
