import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">StudyGen</p>
          <p className="mt-1">Flashcards and quizzes from your own notes.</p>
        </div>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/" className="transition-colors hover:text-foreground">
            Generate
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Saved sets
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
