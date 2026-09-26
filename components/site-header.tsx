import Link from 'next/link';
import { Logo } from '@/components/logo';
import { SignOutButton } from '@/components/sign-out-button';
import { SiteNav } from '@/components/site-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { UserIcon } from '@/components/ui/icons';

export function SiteHeader({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0 font-semibold">
            <Logo />
          </Link>
          <SiteNav signedIn={Boolean(email)} />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {email ? (
            <>
              <Link href="/dashboard" className={buttonVariants('secondary', 'sm', 'sm:hidden')}>
                Saved sets
              </Link>
              <SignOutButton />
              <Link
                href="/profile"
                className={buttonVariants('ghost', 'icon')}
                aria-label="Profile"
                title={email}
              >
                <UserIcon />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants('ghost', 'sm')}>
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants('primary', 'sm')}>
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}