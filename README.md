# StudyGen

Turns pasted notes or an uploaded PDF into flashcards or a multiple-choice quiz. Guests can generate and review without an account; signed-in users can save sets to a dashboard.

Next.js (App Router) · TypeScript · Tailwind · Supabase (Auth + Postgres with RLS) · Google Gemini · Upstash Redis · Vercel.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run test                 # 19 tests, no network or API key needed
npm run dev
```

Then run `supabase/schema.sql` in the Supabase SQL editor.

Without `UPSTASH_*` set, rate limiting is disabled in development and **refuses all generation requests in production** — an unconfigured limiter in a deployed environment is a misconfiguration, not a reason to hand out free model calls.

## Why structured AI output is harder than it looks

The API call is the easy part. The hard part is that the model is an untrusted input source that happens to be usually right.

Gemini supports `responseSchema`, which constrains output to a JSON shape. That is a strong hint, not a guarantee. Within a minute of testing against real notes, this came back:

```json
{ "items": [
  { "question": "Which organelle produces most of the cell's ATP?",
    "options": ["Mitochondria", "Mitochondria", "Ribosome", "Golgi apparatus"],
    "correctIndex": 0,
    "explanation": "..." } ] }
```

Schema-valid. Four strings, an integer in range, every required field present. Also completely broken: two options are identical, so the question has two correct answers. No type system catches this, because nothing about it is a type error.

That is why validation happens in three layers, in `lib/ai/generate-study-set.ts`:

1. **Parse.** Models wrap JSON in ```` ```json ```` fences or a line of preamble often enough to be worth handling. The salvage is deliberately dumb — strip one fence, or take the outermost braces — because anything cleverer starts guessing at meaning, and a wrong guess is worse than an honest retry.
2. **Schema.** Zod, with the semantic checks the API schema can't express: trimmed non-empty strings (so a whitespace-only `back` doesn't render as a blank card), `correctIndex` bounded to 0–3, and four *distinct* options.
3. **Count.** A short set is a failure, not a partial success. Rendering 4 cards when the user asked for 10 is a silent bug that looks like a working feature. An over-long set is trimmed instead, because a retry costs a real API call.

On failure at any layer, the module retries **once**, feeding the specific Zod error back into the prompt — not "try again", but `items.0.options: options must be four distinct strings`. On the second failure it returns a typed result. It never throws, and raw model output never reaches the user: that goes into a `diagnostics` array meant for logs, while `message` carries copy a person can act on.

The return type is a discriminated union, so a caller cannot read `.items` without first narrowing on `ok`:

```ts
{ ok: true; type: 'quiz'; items: QuizItem[]; modelVersion: string; attempts: number }
| { ok: false; reason: FailureCode; message: string; diagnostics: string[]; attempts: number }
```

**The tests are the point.** `lib/ai/generate-study-set.test.ts` has 19 cases, and only two of them are the happy path. The rest feed the module output a real model has actually produced: a missing field, a stringified `correctIndex`, an out-of-range index, duplicate options, a whitespace-only field, an empty array, fenced JSON, prose instead of data, a thrown transport error. Several assert things the module must *not* do — not burn a retry on salvageable JSON, not spend a second call on a transport error that never landed, not leak raw output into a user-facing message.

The model client is injected rather than imported, which is what makes all of that testable without network mocking. `lib/ai/gemini-client.ts` is pure transport and does no parsing, so there is exactly one place in the codebase where model output becomes trusted data.

## Rate limiting

`/api/generate` has real marginal cost: every request is a paid model call, unlike the GWA calculator's free client-side arithmetic. Two Upstash windows are enforced (`lib/rate-limit.ts`): a short burst window so a stuck retry loop stops quickly, and a daily window so a patient scraper can't drain the quota overnight.

Signed-in users are keyed by user id rather than IP, so a shared campus NAT doesn't lock out a whole building.

## Security notes

- The Gemini key is read only in server code, behind `import 'server-only'`, so an accidental client import is a build error rather than a leaked key.
- Size and character caps are enforced server-side in `lib/extract-text.ts`. The client enforces the same limits for a faster error message; that copy is a convenience, the server's is the boundary.
- The server Supabase client uses the anon key, never the service role key, so every query is still subject to RLS. A bug in a route handler's filter clause cannot leak another user's rows.
- The dashboard query deliberately omits `.eq('user_id', ...)` so the RLS policy is what's actually being exercised.
- Saved sets are re-validated against the generation schemas on POST. The client round-trip is not a reason to trust the payload, or the save endpoint becomes a way to store arbitrary JSON under a user id.

## Known limitations

- Free-tier Gemini has per-minute and per-day request limits. Under load, users see a 502 with an honest message, not a spinner.
- Generation quality tracks input quality. Very short, abstract, or bullet-fragment notes produce weak questions — which is why sub-200-character input is rejected before a call is made rather than after paying for a bad one.
- Only the first 8,000 characters of a long document are used, and the UI says so rather than silently truncating.
- Scanned PDFs have no text layer. `pdf-parse` returns empty, and the error says to paste the text instead.
- Review scheduling is one round of "got it" versus "review again". It is not spaced repetition and doesn't claim to be.
- Rate limiting keys guests by forwarded IP, which is spoofable in general; it's set by Vercel's proxy in deployment, but a determined abuser behind rotating IPs isn't stopped by this alone. Turnstile is the next step.

## What I'd do differently at scale

- **Queue generation.** It's a synchronous request that can take 15 seconds. At volume that should be a job with a polling or streaming client, not a held-open connection against a 60-second function limit.
- **Cache by content hash.** Identical notes regenerate from scratch today. Hashing normalized input plus options would cut cost noticeably for shared class material.
- **Log failures as structured events, not `console.warn`.** The `diagnostics` array is already shaped for this. Tracking failure rate by `reason` would show whether a prompt change helps or hurts, which is currently unmeasurable.
- **Store a prompt version alongside `model_version`.** Right now a saved set records which model wrote it but not which prompt, so a regression can't be traced to the change that caused it.
- **Move cost control to per-user quotas.** IP-based limiting is the right first cut and the wrong hundredth.

## Design system

The UI follows the shadcn/ui approach: semantic tokens, hairline borders, a neutral palette, and light and dark themes.

- **Tokens.** Every colour is a role (`background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, `ring`), defined as HSL components in the `:root` (light) and `.dark` blocks of `app/globals.css` and mapped to Tailwind in `tailwind.config.ts`. Components never use raw colours, so re-theming means editing those two blocks and nothing else.
- **Theme.** `app/layout.tsx` runs a tiny inline script before first paint that follows the system setting until the person picks a theme, then remembers the choice in `localStorage`. `components/theme-toggle.tsx` is the switch.
- **Primitives.** `components/ui/` holds `Button` (plus `buttonVariants` for link-styled buttons), `Card`, `Input`/`Textarea`/`Select`, `Alert`, `Badge`, `Segmented`, and a small inline icon set (`icons.tsx`) so there is no icon dependency.
- **Flashcards.** `components/flashcards/flashcard-review.tsx` plus the `flashcard:start`/`flashcard:end` block in `app/globals.css`. The card is plain CSS on purpose (no `@apply`), so the 3D flip and the keyframes behave the same regardless of Tailwind's class scanning. Click or press Space to flip; drag the card, or press the left and right arrow keys, to sort it. `prefers-reduced-motion` turns every animation off and sorts instantly.
