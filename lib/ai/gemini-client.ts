import 'server-only';
import type { ModelClient, ModelRequest } from './generate-study-set';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 25_000;

/**
 * The only place that talks to Gemini. It does one job — turn a ModelRequest
 * into raw text — and deliberately does no parsing or validation, so that
 * generate-study-set.ts stays the single place where trust is granted.
 *
 * `server-only` at the top makes an accidental client import a build error
 * rather than a leaked API key.
 */
export function createGeminiClient(): ModelClient {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  return {
    modelVersion: MODEL,

    async generate(request: ModelRequest): Promise<string> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: request.userContent }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: request.responseSchema,
              temperature: 0.4,
              maxOutputTokens: 4096,
            },
          }),
        });

        if (!response.ok) {
          // Body may carry a useful reason; it is logged upstream via
          // diagnostics, never shown to the user.
          const body = await response.text().catch(() => '');
          throw new Error(`Gemini responded ${response.status}: ${body.slice(0, 200)}`);
        }

        const payload = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        };

        const candidate = payload.candidates?.[0];
        if (candidate?.finishReason === 'MAX_TOKENS') {
          // Truncated JSON would fail parsing anyway; say so plainly in the log.
          throw new Error('Gemini output was truncated at the token limit');
        }

        const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        if (!text) throw new Error('Gemini returned no text content');
        return text;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
