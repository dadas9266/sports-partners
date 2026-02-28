import { Redis } from "@upstash/redis";

// Redis bağlantısı - env yoksa veya placeholder ise null döner (graceful degradation)
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Placeholder veya eksik değerler varsa Redis'i devre dışı bırak
  if (
    !url || !token ||
    url.startsWith("https://your-") ||
    token === "your-redis-token" ||
    url === "https://your-redis.upstash.io"
  ) {
    return null;
  }
  return new Redis({ url, token });
}

// Cache TTL değerleri (saniye)
export const CACHE_TTL = {
  LISTINGS: 60,          // İlan listesi: 1 dakika
  VENUES: 60 * 60 * 24, // Mekan listesi: 24 saat
  PLACES: 60 * 60 * 24, // Google Places sonuçları: 24 saat
  SPORTS: 60 * 60,       // Spor listesi: 1 saat
  LEADERBOARD: 60 * 5,   // Liderlik tablosu: 5 dakika
  PROFILE: 60 * 5,       // Profil: 5 dakika
} as const;

// Cache key oluşturucu - tutarlı key formatı
export const cacheKey = {
  listings: (filters: Record<string, unknown>) =>
    `listings:${JSON.stringify(filters)}`,
  venues: (districtId: string, sportId?: string) =>
    `venues:${districtId}:${sportId ?? "all"}`,
  googlePlaces: (query: string, lat: number, lng: number) =>
    `places:${query}:${lat.toFixed(3)}:${lng.toFixed(3)}`,
  sports: () => "sports:all",
  leaderboard: (sportId?: string) => `leaderboard:${sportId ?? "all"}`,
  profile: (userId: string) => `profile:${userId}`,
  userListings: (userId: string) => `user-listings:${userId}`,
} as const;

// Cache'den veri al
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    if (!redis) return null;
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch {
    return null; // Redis hata verse bile uygulama devam eder
  }
}

// Cache'e veri yaz
export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(key, value, { ex: ttl });
  } catch {
    // Sessizce geç
  }
}

// Cache'den sil
export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(key);
  } catch {
    // Sessizce geç
  }
}

// Pattern ile toplu silme (örn: "listings:*")
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Sessizce geç
  }
}

// Cache-aside wrapper: varsa getir, yoksa hesapla ve kaydet
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const result = await fn();
  await cacheSet(key, result, ttl);
  return result;
}
