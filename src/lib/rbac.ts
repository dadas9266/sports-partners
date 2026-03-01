import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type RBACSession = {
  user: {
    id: string;
    isAdmin: boolean;
    name?: string | null;
    email?: string | null;
  };
};

/**
 * Sunucu tarafında oturumu alır.
 * Oturum yoksa 401 döner.
 */
export async function requireAuth(): Promise<
  RBACSession | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Giriş yapmanız gerekiyor" },
      { status: 401 }
    );
  }
  return session as RBACSession;
}

/**
 * Yalnızca admin kullanıcılarına izin verir.
 * Admin değilse 403 döner.
 */
export async function requireAdmin(): Promise<
  RBACSession | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Giriş yapmanız gerekiyor" },
      { status: 401 }
    );
  }
  if (!session.user.isAdmin) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz yok" },
      { status: 403 }
    );
  }
  return session as RBACSession;
}

/**
 * Type guard - requireAuth / requireAdmin çıktısını kontrol eder.
 * Kullanım: if (isError(result)) return result;
 */
export function isError(
  result: RBACSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
