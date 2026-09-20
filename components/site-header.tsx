import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { LayersIcon } from '@/components/ui/icons';

export function SiteHeader({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <LayersIcon className="size-4" />
            </span>
            <span className="hidden min-[400px]:inline">StudyGen</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Generate
            </Link>
            {email ? (
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Saved sets
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {email ? (
            <>
              <Link href="/dashboard" className={buttonVariants('secondary', 'sm', 'sm:hidden')}>
                Saved sets
              </Link>
              <SignOutButton />
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
