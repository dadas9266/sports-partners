/**
 * Rate Limiter — Upstash Redis (sliding window)
 * Redis env tanımlıysa Redis kullanılır, değilse in-memory fallback devreye girer.
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN gerekli.
 */
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// ─── Redis client (cache.ts ile aynı pattern) ────────────────────────────────
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (
    !url || !token ||
    url.startsWith("https://your-") ||
    token === "your-redis-token"
  ) {
    return null;
  }
  return new Redis({ url, token });
}

// ─── Config ──────────────────────────────────────────────────────────────────
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  listing:  { maxAttempts: 5,  windowMs: 24 * 60 * 60 * 1000 }, // 5/gün
  auth:     { maxAttempts: 10, windowMs: 15 * 60 * 1000 },       // 10/15dk
  register: { maxAttempts: 5,  windowMs: 60 * 60 * 1000 },       // 5/saat
  response: { maxAttempts: 20, windowMs: 60 * 60 * 1000 },       // 20/saat
  message:  { maxAttempts: 60, windowMs: 60 * 1000 },            // 60/dk
  post:     { maxAttempts: 10, windowMs: 60 * 60 * 1000 },       // 10/saat
  upload:   { maxAttempts: 20, windowMs: 60 * 60 * 1000 },       // 20/saat
  rating:   { maxAttempts: 5,  windowMs: 24 * 60 * 60 * 1000 },  // 5/gün
};

// ─── In-memory fallback (Redis yoksa) ────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkInMemory(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number } {
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

// ─── Redis sliding-window implementasyonu ────────────────────────────────────
async function checkRedis(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const windowSec = Math.ceil(config.windowMs / 1000);
  const redisKey = `rl:${key}`;

  // INCR + EXPIRE (ilk çağrıda TTL set edilir, devamında artırılır)
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSec);
  }

  if (count > config.maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: config.maxAttempts - count };
}

// ─── Public API (imza değişmedi, artık async) ─────────────────────────────────
export async function checkRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMIT_CONFIGS = "listing"
): Promise<{ allowed: boolean; remaining: number }> {
  const config = RATE_LIMIT_CONFIGS[type];
  const key = `${type}:${identifier}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      return await checkRedis(redis, key, config);
    } catch {
      // Redis bağlantı hatası → in-memory fallback
    }
  }
  return checkInMemory(key, config);
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
export function rateLimitResponse(remaining = 0) {
  return NextResponse.json(
    { success: false, error: "Çok fazla istek gönderdiniz. Lütfen bekleyin." },
    { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": String(remaining) } }
  );
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// In-memory fallback cleanup (sadece Redis yokken aktif)
const globalForCleanup = globalThis as unknown as { _rateLimitCleanup?: ReturnType<typeof setInterval> };
if (typeof setInterval !== "undefined" && !globalForCleanup._rateLimitCleanup) {
  globalForCleanup._rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetTime) rateLimitMap.delete(key);
    }
  }, 10 * 60 * 1000);
}
