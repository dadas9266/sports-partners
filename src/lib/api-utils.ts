import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getSession() {
  return await getServerSession(authOptions);
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
