import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "En az 8 karakter")
    .regex(/[A-Z]/, "Büyük harf gerekli")
    .regex(/[a-z]/, "Küçük harf gerekli")
    .regex(/[0-9]/, "Rakam gerekli")
    .regex(/[^A-Za-z0-9]/, "Özel karakter gerekli"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = schema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.used) {
      return NextResponse.json({ success: false, error: "Geçersiz veya süresi dolmuş link" }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ success: false, error: "Link süresi dolmuş, yeniden talep edin" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { passwordHash: hash },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Şifre başarıyla güncellendi" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0].message }, { status: 400 });
    }
    logger.error("reset-password hata:", err);
    return NextResponse.json({ success: false, error: "Bir hata oluştu" }, { status: 500 });
  }
}
