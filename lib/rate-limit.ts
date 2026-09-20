import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting is here from day one because /api/generate has real marginal
 * cost: every request is a paid model call. Unlike the GWA calculator's
 * client-side arithmetic, an unthrottled loop against this endpoint spends
 * money, not just CPU.
 *
 * Two windows, both enforced:
 *   - a short burst window, so a stuck retry loop stops quickly
 *   - a daily window, so a patient scraper can't drain the quota overnight
 */

const configured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = configured ? Redis.fromEnv() : null;

const burst = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'studygen:burst',
      analytics: false,
    })
  : null;

const daily = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(40, '24 h'),
      prefix: 'studygen:daily',
      analytics: false,
    })
  : null;

export type RateLimitVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number; scope: 'burst' | 'daily' }
  | { allowed: false; retryAfterSeconds: number; scope: 'unconfigured' };

/**
 * Fails closed in production. An unconfigured limiter in a deployed
 * environment is a misconfiguration, not a reason to hand out free calls —
 * so it refuses rather than silently disabling itself.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitVerdict> {
  if (!burst || !daily) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Rate limiter is not configured; refusing generation requests.');
      return { allowed: false, retryAfterSeconds: 60, scope: 'unconfigured' };
    }
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }

  const burstResult = await burst.limit(identifier);
  if (!burstResult.success) {
    return { allowed: false, retryAfterSeconds: secondsUntil(burstResult.reset), scope: 'burst' };
  }

  const dailyResult = await daily.limit(identifier);
  if (!dailyResult.success) {
    return { allowed: false, retryAfterSeconds: secondsUntil(dailyResult.reset), scope: 'daily' };
  }

  return { allowed: true, remaining: dailyResult.remaining };
}

function secondsUntil(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

/**
 * Identifies the caller for rate-limiting purposes.
 *
 * A logged-in user is keyed by user id so that a shared campus NAT doesn't
 * lock out a whole building. Guests fall back to the forwarded IP, which is
 * spoofable in general but is set by Vercel's proxy in deployment.
 */
export function rateLimitIdentifier(request: Request, userId: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}
