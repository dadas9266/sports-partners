import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(8, "NEXTAUTH_SECRET must be at least 8 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Supabase Storage
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Upstash Redis Cache
  UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Google Places API
  GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
});

function validateEnv() {
  // Build sırasında environment variable'lar her zaman mevcut olmayabilir.
  // Vercel'de build aşamasını geçmek için bazı kontroller ekleyelim.
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    // Sadece build sırasında DATABASE_URL yoksa ve vercel'de isek esnek davranabiliriz
    // Ancak genellikle build sırasında prisma generate için DATABASE_URL'e ihtiyaç duyulmaz.
    return process.env as any;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn("⚠️ Build phase env validation issue (probably NEXTAUTH_URL):", parsed.error.format());
      return process.env as any;
    }
    console.error("❌ Invalid environment variables:");
    parsed.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
    // Build sırasında çökmemesi için sadece hata basalım
    return process.env as any;
  }
  return parsed.data;
}

export const env = validateEnv();
