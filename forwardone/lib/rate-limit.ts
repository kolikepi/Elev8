// Minimal in-memory sliding-window rate limiter for public (unauthenticated) endpoints.
// Not distributed — good enough to blunt abuse/enumeration on a single instance. Keyed by IP + bucket.
type Hit = { count: number; resetAt: number }
const buckets = new Map<string, Hit>()

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): { ok: boolean; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, retryAfterMs: 0 }
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) }
  }
  existing.count += 1
  return { ok: true, retryAfterMs: 0 }
}

// Opportunistic cleanup so the Map cannot grow unbounded.
export function sweepRateLimit(): void {
  const now = Date.now()
  buckets.forEach((v, k) => { if (v.resetAt <= now) buckets.delete(k) })
}
