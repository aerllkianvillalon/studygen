import { Generator } from '@/components/generator/generator';
import { HeroDeck } from '@/components/hero-deck';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { AlertIcon, ArrowRightIcon, FileTextIcon, InfoIcon, SparklesIcon } from '@/components/ui/icons';
import { getSessionUser } from '@/lib/supabase/server';

const notes = [
  {
    icon: InfoIcon,
    title: 'Check what matters',
    body: 'Questions come from a language model, so double-check anything you will be tested on.',
  },
  {
    icon: FileTextIcon,
    title: 'First 8,000 characters',
    body: 'Only the start of a long document is used. Split big notes into sections.',
  },
  {
    icon: AlertIcon,
    title: 'Text-based PDFs only',
    body: "Scanned PDFs without selectable text won't work — paste the text instead.",
  },
  {
    icon: SparklesIcon,
    title: 'Rate limited',
    body: 'Each generation costs real money to run, so requests are limited per person.',
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader email={user?.email ?? null} />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-5 pb-14 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
            <div className="text-center lg:text-left">
              <Badge className="rounded-full px-3 py-1">
                <SparklesIcon className="size-3.5" />
                No account needed to try it
              </Badge>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Turn your notes into flashcards and quizzes
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                Paste text or upload a PDF. Flip through cards you can sort as you go, or take a multiple-choice quiz
                with explanations.
              </p>
              <div className="mt-8 flex justify-center lg:justify-start">
                <a href="#generate" className={buttonVariants('primary', 'lg')}>
                  Make a set from your notes
                  <ArrowRightIcon />
                </a>
              </div>
            </div>

            <HeroDeck />
          </div>
        </section>

        <section id="generate" className="mx-auto max-w-3xl scroll-mt-20 px-5">
          <Generator signedIn={Boolean(user)} />
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-20 pt-16">
          <h2 className="text-lg font-semibold tracking-tight">Worth knowing</h2>
          <div className="mt-4 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
            {notes.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-card p-5">
                <Icon className="size-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
