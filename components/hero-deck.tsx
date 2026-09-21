'use client';

import { useEffect, useRef, useState } from 'react';
import { FlipIcon } from '@/components/ui/icons';

const SAMPLES = [
  { front: 'What does the mitochondrion do?', back: 'Produces most of the cell’s ATP through respiration.' },
  { front: 'Why did the Berlin Wall fall in 1989?', back: 'Mass protest, and East Germany’s border policy collapsing under it.' },
  { front: 'What is the derivative of sin(x)?', back: 'cos(x)' },
];

/**
 * A live card on the landing page: the first thing a visitor can touch is the
 * product's core interaction. It reuses the study card's CSS, so it flips the
 * same way, and cycles through a few samples so it isn't a static picture.
 */
export function HeroDeck() {
  const [flipped, setFlipped] = useState(false);
  const [lift, setLift] = useState<'none' | 'a' | 'b'>('none');
  const [index, setIndex] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function flip() {
    setLift((l) => (l === 'a' ? 'b' : 'a'));
    setFlipped((f) => !f);
    if (flipped) {
      // Turning back to the prompt: swap the sample while the card is edge-on.
      timer.current = window.setTimeout(() => setIndex((i) => (i + 1) % SAMPLES.length), 320);
    }
  }

  const sample = SAMPLES[index];

  return (
    <div className="hd-stage">
      <div className="hd-ghost hd-ghost-left" aria-hidden="true" />
      <div className="hd-ghost hd-ghost-right" aria-hidden="true" />

      <div
        className="hd-front"
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Sample flashcard, showing the answer. Activate for the next card.' : 'Sample flashcard, showing the prompt. Activate to see the answer.'}
        onClick={flip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            flip();
          }
        }}
      >
        <div className="fc-scene" data-lift={lift}>
          <div className="fc-flip" data-flipped={flipped}>
            <div className="fc-face fc-front" aria-hidden={flipped}>
              <div className="fc-head">
                <span>Prompt</span>
                <span className="fc-head-count">Sample</span>
              </div>
              <div className="fc-body">
                <p className="fc-text text-lg sm:text-xl">{sample.front}</p>
              </div>
              <div className="fc-hint">
                <FlipIcon className="size-3" />
                Try it — click to flip
              </div>
            </div>
            <div className="fc-face fc-back" aria-hidden={!flipped}>
              <div className="fc-head">
                <span>Answer</span>
                <span className="fc-head-count">Sample</span>
              </div>
              <div className="fc-body">
                <p className="fc-text text-lg sm:text-xl">{sample.back}</p>
              </div>
              <div className="fc-hint">
                <FlipIcon className="size-3" />
                Click for the next card
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
