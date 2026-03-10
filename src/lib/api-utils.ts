import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const apiLog = createLogger("api");

export async function getSession() {
  return await auth();
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

// CUID format validation
const CUID_REGEX = /^c[a-z0-9]{24,}$/;
export function isValidId(id: string): boolean {
  return CUID_REGEX.test(id);
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Giriş yapmanız gerekiyor" },
    { status: 401 }
  );
}

export function notFound(message = "Kaynak bulunamadı") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

export function forbidden(message = "Bu işlem için yetkiniz yok") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

export function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function serverError(error: string) {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Kullanıcı girdisinden basit XSS karakter ve HTML tag temizliği yapar.
 * Zod max-length doğrulamasından SONRA çağrılmalı.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")          // HTML tag'leri kaldır
    .replace(/javascript:/gi, "")      // javascript: protokolünü kaldır
    .replace(/on\w+\s*=/gi, "")        // onerror= onclick= vb. kaldır
    .trim();
}

// ── Prisma hata kodlarını kullanıcı dostu mesajlara çevirir ────────────────
function prismaErrorMessage(err: Prisma.PrismaClientKnownRequestError): string {
  switch (err.code) {
    case "P2002": return "Bu kayıt zaten mevcut";
    case "P2025": return "Kayıt bulunamadı";
    case "P2003": return "İlişkili kayıt bulunamadı";
    case "P2014": return "Bu işlem kısıtlamaya takıldı";
    default:      return "Veritabanı hatası";
  }
}

// ── Route handler tiplerini tanımla ─────────────────────────────────────────
type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>;

/**
 * Tüm API route handler'larını saran hata yönetimi wrapper'ı.
 * - Prisma hatalarını anlamlı mesajlara çevirir
 * - Yapılandırılmış logger ile loglar
 * - Kullanıcıya temiz JSON döner
 */
export function withErrorHandler(handler: RouteHandler, context?: string): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const tag = context || `${req.method} ${req.nextUrl.pathname}`;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        apiLog.warn(`Prisma error [${tag}]`, { code: error.code, meta: error.meta as Record<string, unknown> });
        const status = error.code === "P2025" ? 404 : 400;
        return NextResponse.json(
          { success: false, error: prismaErrorMessage(error) },
          { status }
        );
      }

      Sentry.captureException(error, { tags: { route: tag } });
      apiLog.error(`Unhandled error [${tag}]`, error);
      return NextResponse.json(
        { success: false, error: "Bir hata oluştu, lütfen tekrar deneyin" },
        { status: 500 }
      );
    }
  };
}
