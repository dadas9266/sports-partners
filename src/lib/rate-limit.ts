// In-memory rate limiter (production'da Redis ile değiştirilmeli)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  listing: { maxAttempts: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5/gün
  auth: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },        // 10/15dk
  register: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },     // 5/saat
  response: { maxAttempts: 20, windowMs: 60 * 60 * 1000 },    // 20/saat
};

export function checkRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMIT_CONFIGS = "listing"
): { allowed: boolean; remaining: number } {
  const config = RATE_LIMIT_CONFIGS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxAttempts - 1 };
  }

  if (entry.count >= config.maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxAttempts - entry.count };
}

// IP-based rate limit helper for auth endpoints
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Cleanup old entries periodically (her 10 dakikada bir)
// globalThis ile HMR sırasında çoklu interval oluşmasını engelliyoruz
const globalForCleanup = globalThis as unknown as { _rateLimitCleanup?: ReturnType<typeof setInterval> };

if (typeof setInterval !== "undefined" && !globalForCleanup._rateLimitCleanup) {
  globalForCleanup._rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}
