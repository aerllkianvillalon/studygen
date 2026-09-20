'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { CheckIcon, FlipIcon, UndoIcon } from '@/components/ui/icons';
import type { Flashcard } from '@/lib/ai/schemas';

/**
 * Review runs in rounds. Cards marked "Review again" come back in the next
 * round; cards marked "Got it" drop out. That is the whole scheduling model —
 * honest about being simple, rather than implying a spaced-repetition system
 * that isn't there.
 *
 * Interaction: click or press Space to flip; drag the card (or use the arrow
 * keys) to sort it. Right = got it, left = review again.
 */

const EXIT_MS = 340; // keep in step with fc-exit-* in globals.css
const SWIPE_THRESHOLD = 110; // px of horizontal drag that commits a sort
const TAP_SLOP = 6; // px of movement that still counts as a tap

type ExitDirection = 'left' | 'right';

export function FlashcardReview({ items }: { items: Flashcard[] }) {
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [repeat, setRepeat] = useState<number[]>([]);
  const [round, setRound] = useState(1);

  // Presentation state for the card itself.
  const [lift, setLift] = useState<'none' | 'a' | 'b'>('none');
  const [exit, setExit] = useState<ExitDirection | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pointer = useRef<{ id: number; startX: number; moved: boolean } | null>(null);
  const lastDragX = useRef(0);
  const exitTimer = useRef<number | null>(null);

  const total = queue.length;
  const done = position >= total;
  const card = done ? null : items[queue[position]];
  const progress = useMemo(() => (total === 0 ? 0 : Math.round((position / total) * 100)), [position, total]);
  const behind = done ? 0 : Math.min(2, total - position - 1);
  const known = position - repeat.length;
  const tall = useMemo(() => items.some((item) => Math.max(item.front.length, item.back.length) > 180), [items]);

  useEffect(() => {
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  function flip() {
    if (exit) return;
    setFlipped((f) => !f);
    // Alternating between two identical keyframes restarts the lift every flip.
    setLift((l) => (l === 'a' ? 'b' : 'a'));
  }

  function advance(keep: boolean) {
    if (keep) setRepeat((prev) => [...prev, queue[position]]);
    setFlipped(false);
    setLift('none');
    setDragX(0);
    lastDragX.current = 0;
    setPosition((prev) => prev + 1);
  }

  /** keep = true sends the card to the "review again" pile (left). */
  function sort(keep: boolean) {
    if (exit || done) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      advance(keep);
      return;
    }
    setExit(keep ? 'left' : 'right');
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setExit(null);
      advance(keep);
    }, EXIT_MS);
  }

  function nextRound() {
    setQueue(repeat);
    setRepeat([]);
    setPosition(0);
    setFlipped(false);
    setLift('none');
    setRound((r) => r + 1);
  }

  function restart() {
    setQueue(items.map((_, i) => i));
    setRepeat([]);
    setPosition(0);
    setFlipped(false);
    setLift('none');
    setRound(1);
  }

  // The keyboard handler is registered once and reads the latest actions
  // through a ref, so it never acts on a stale closure.
  const actions = useRef({ flip, sort });
  actions.current = { flip, sort };

  useEffect(() => {
    if (done) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      // Never steal keys from text entry (e.g. the "name this set" field).
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        actions.current.sort(false);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        actions.current.sort(true);
      } else if (event.key === ' ' || event.key === 'Enter') {
        // Focused buttons and links handle Space/Enter themselves.
        if (target?.closest('button, a')) return;
        event.preventDefault();
        actions.current.flip();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [done]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (exit || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = pointer.current;
    if (!current || current.id !== event.pointerId) return;
    const delta = event.clientX - current.startX;
    if (!current.moved) {
      if (Math.abs(delta) < TAP_SLOP) return;
      current.moved = true;
      setDragging(true);
    }
    lastDragX.current = delta;
    setDragX(delta);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = pointer.current;
    pointer.current = null;
    if (!current || current.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!current.moved) {
      flip(); // a tap or click
      return;
    }

    setDragging(false);
    const delta = lastDragX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      sort(delta < 0); // the exit animation continues from where the drag ended
    } else {
      setDragX(0); // snap back
      lastDragX.current = 0;
    }
  }

  function onPointerCancel() {
    pointer.current = null;
    lastDragX.current = 0;
    setDragging(false);
    setDragX(0);
  }

  if (done) {
    const remaining = repeat.length;
    return (
      <Card className="mx-auto w-full max-w-xl animate-reveal">
        <CardBody className="space-y-6 py-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <CheckIcon className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Round {round} finished</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {remaining === 0
                ? `You got through all ${total} ${total === 1 ? 'card' : 'cards'} without marking any for review.`
                : `${total - remaining} of ${total} marked as known. ${remaining} left to review.`}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {remaining > 0 ? <Button onClick={nextRound}>Review the {remaining} remaining</Button> : null}
            <Button variant="secondary" onClick={restart}>
              Start over
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const dragStyle =
    dragX !== 0 || dragging ? { transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)` } : undefined;
  const knownStamp = exit === 'right' ? 1 : Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const againStamp = exit === 'left' ? 1 : Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {position + 1} of {total}
            {round > 1 ? ` · round ${round}` : ''}
          </span>
          <span className="tabular-nums">
            {known} known · {repeat.length} to review
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Round progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="fc-stage">
        <div className="fc-deck" data-tall={tall}>
          {Array.from({ length: behind }, (_, i) => (
            <div key={i} className="fc-ghost" data-depth={i + 1} aria-hidden="true" />
          ))}

          <div
            // Remounting per card replays the "rise from the stack" entrance.
            key={`${round}-${position}`}
            className="fc-card"
            role="button"
            tabIndex={0}
            aria-label={
              flipped ? 'Flashcard, showing the answer. Activate to show the prompt.' : 'Flashcard, showing the prompt. Activate to show the answer.'
            }
            data-dragging={dragging}
            data-exit={exit ?? undefined}
            style={dragStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            <div className="fc-scene" data-lift={lift}>
              <div className="fc-flip" data-flipped={flipped}>
                <Face
                  side="front"
                  label="Prompt"
                  text={card!.front}
                  count={`${position + 1} / ${total}`}
                  hint="Click to flip"
                  hidden={flipped}
                />
                <Face
                  side="back"
                  label="Answer"
                  text={card!.back}
                  count={`${position + 1} / ${total}`}
                  hint="Click to flip back"
                  hidden={!flipped}
                />
              </div>
            </div>

            <span className="fc-stamp fc-stamp-known" style={{ opacity: knownStamp }} aria-hidden="true">
              Got it
            </span>
            <span className="fc-stamp fc-stamp-again" style={{ opacity: againStamp }} aria-hidden="true">
              Review again
            </span>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {flipped ? `Answer: ${card!.back}` : `Prompt: ${card!.front}`}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button variant="secondary" size="lg" onClick={() => sort(true)} disabled={exit !== null}>
          <UndoIcon />
          Review again
        </Button>
        <Button variant="secondary" size="lg" onClick={flip} disabled={exit !== null}>
          <FlipIcon />
          {flipped ? 'Hide answer' : 'Show answer'}
        </Button>
        <Button size="lg" onClick={() => sort(false)} disabled={exit !== null}>
          <CheckIcon />
          Got it
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <span className="hidden sm:inline">
          <Kbd>Space</Kbd> flips · <Kbd>←</Kbd> review again · <Kbd>→</Kbd> got it · or{' '}
        </span>
        <span className="sm:hidden">Tap to flip. </span>
        <span>drag the card left or right</span>
      </p>
    </div>
  );
}

function Face({
  side,
  label,
  text,
  count,
  hint,
  hidden,
}: {
  side: 'front' | 'back';
  label: string;
  text: string;
  count: string;
  hint: string;
  hidden: boolean;
}) {
  return (
    <div className={`fc-face ${side === 'front' ? 'fc-front' : 'fc-back'}`} aria-hidden={hidden}>
      <div className="fc-head">
        <span>{label}</span>
        <span className="fc-head-count">{count}</span>
      </div>
      <div className="fc-body">
        <p className={`fc-text ${textSize(text)}`}>{text}</p>
      </div>
      <div className="fc-hint">
        <FlipIcon className="size-3" />
        {hint}
      </div>
    </div>
  );
}

/** Long answers shrink rather than overflow the card. */
function textSize(text: string): string {
  if (text.length <= 60) return 'text-2xl sm:text-3xl';
  if (text.length <= 140) return 'text-xl sm:text-2xl';
  if (text.length <= 260) return 'text-base sm:text-lg';
  return 'text-sm sm:text-base';
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  );
}
