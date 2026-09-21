'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, UndoIcon, XIcon } from '@/components/ui/icons';
import { recordActivity } from '@/lib/study-stats';
import { cn } from '@/lib/utils';
import type { QuizItem } from '@/lib/ai/schemas';

const CELEBRATE_AT = 80; // percent

export function QuizRunner({ items }: { items: QuizItem[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const nextButton = useRef<HTMLButtonElement>(null);

  const question = items[index];
  const finished = index >= items.length;

  // After answering, move focus to the next step so the keyboard flow is
  // answer → Enter → next question, without hunting for the button.
  useEffect(() => {
    if (selected !== null) nextButton.current?.focus();
  }, [selected]);

  function choose(optionIndex: number) {
    if (selected !== null || finished) return;
    setSelected(optionIndex);
    const correct = optionIndex === question.correctIndex;
    if (correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, correct]);
    setPicks((prev) => [...prev, optionIndex]);
  }

  function next() {
    if (selected === null) return;
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setPicks([]);
  }

  // Registered once; reads the latest handlers through a ref (no stale closures).
  const actions = useRef({ choose, next, optionCount: 0, answered: false });
  actions.current = { choose, next, optionCount: question?.options.length ?? 0, answered: selected !== null };

  useEffect(() => {
    if (finished) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const current = actions.current;

      if (!current.answered) {
        // 1–4 or A–D pick an option.
        const digit = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
        const letter = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase().charCodeAt(0) - 97 : -1;
        const picked = digit >= 0 ? digit : letter;
        if (picked >= 0 && picked < current.optionCount) {
          event.preventDefault();
          current.choose(picked);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        current.next();
      }
      // Enter on the focused "Next" button is handled by the button itself.
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finished]);

  if (finished) {
    return <Results items={items} score={score} answers={answers} picks={picks} onRestart={restart} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {items.length}
          </span>
          <span className="tabular-nums">
            Score {score}/{answers.length}
          </span>
        </div>
        {/* One segment per question, coloured as answers come in. */}
        <div className="flex gap-1.5" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i < answers.length ? (answers[i] ? 'bg-success' : 'bg-destructive') : i === index ? 'bg-foreground/40' : 'bg-secondary',
              )}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="space-y-6 p-5 sm:p-8">
          <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-2xl">{question.question}</h3>

          <div className="space-y-2.5" role="group" aria-label="Answer options">
            {question.options.map((option, optionIndex) => {
              const isAnswer = optionIndex === question.correctIndex;
              const isPicked = optionIndex === selected;
              const revealed = selected !== null;

              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => choose(optionIndex)}
                  disabled={revealed}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm leading-relaxed transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    !revealed && 'border-input hover:border-foreground/40 hover:bg-accent',
                    revealed && isAnswer && 'border-success bg-success/10',
                    revealed && isPicked && !isAnswer && 'border-destructive bg-destructive/10',
                    revealed && !isAnswer && !isPicked && 'text-muted-foreground opacity-70',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-md border text-xs font-medium transition-colors',
                      !revealed && 'bg-background text-muted-foreground group-hover:text-foreground',
                      revealed && isAnswer && 'border-success bg-success text-background',
                      revealed && isPicked && !isAnswer && 'border-destructive bg-destructive text-background',
                    )}
                  >
                    {revealed && isAnswer ? (
                      <CheckIcon className="size-3.5" />
                    ) : revealed && isPicked ? (
                      <XIcon className="size-3.5" />
                    ) : (
                      String.fromCharCode(65 + optionIndex)
                    )}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          {selected !== null ? (
            <div className="animate-reveal rounded-lg border bg-muted/50 px-4 py-3 text-sm">
              <p className={cn('font-medium', selected === question.correctIndex ? 'text-success' : 'text-destructive')}>
                {selected === question.correctIndex ? 'Correct.' : 'Not this one.'}
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">{question.explanation}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {selected !== null ? (
        <div className="flex justify-end">
          <Button ref={nextButton} size="lg" onClick={next}>
            {index === items.length - 1 ? 'See results' : 'Next question'}
            <ArrowRightIcon />
          </Button>
        </div>
      ) : (
        <p className="hidden text-center text-xs text-muted-foreground sm:block">
          Press <Kbd>A</Kbd>–<Kbd>D</Kbd> or <Kbd>1</Kbd>–<Kbd>4</Kbd> to answer
        </p>
      )}
    </div>
  );
}

function Results({
  items,
  score,
  answers,
  picks,
  onRestart,
}: {
  items: QuizItem[];
  score: number;
  answers: boolean[];
  picks: number[];
  onRestart: () => void;
}) {
  const total = answers.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const missed = answers.map((correct, i) => (correct ? null : i)).filter((n): n is number => n !== null);
  const recorded = useRef(false);

  // Count the finished quiz once toward the study stats.
  useEffect(() => {
    if (recorded.current || total === 0) return;
    recorded.current = true;
    recordActivity({ questions: total, correct: score });
  }, [total, score]);

  // Start the ring empty and fill it on the next frame so it animates in.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {percent >= CELEBRATE_AT ? <Confetti /> : null}

      <Card className="animate-reveal">
        <CardBody className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="relative size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="9" className="stroke-secondary" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - shown / 100)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{percent}%</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              {score} of {total} correct
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {missed.length === 0
                ? 'No misses.'
                : `Questions you missed: ${missed.map((i) => i + 1).join(', ')}.`}
            </p>
          </div>

          <Button variant="secondary" onClick={onRestart}>
            <UndoIcon />
            Take it again
          </Button>
        </CardBody>
      </Card>

      {missed.length > 0 ? (
        <section aria-labelledby="missed-heading" className="space-y-3">
          <h4 id="missed-heading" className="text-sm font-medium">
            Worth another look
          </h4>
          <div className="space-y-2">
            {missed.map((i) => {
              const item = items[i];
              return (
                <details key={i} className="group rounded-lg border bg-card open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-destructive/10 text-[0.7rem] font-medium text-destructive">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{item.question}</span>
                    <ChevronDownIcon className="mt-1 size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2 border-t px-4 py-3 text-sm leading-relaxed">
                    <p>
                      <span className="text-muted-foreground">You chose: </span>
                      <span className="text-destructive">{item.options[picks[i]]}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Correct answer: </span>
                      <span className="font-medium text-success">{item.options[item.correctIndex]}</span>
                    </p>
                    <p className="text-muted-foreground">{item.explanation}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  );
}
