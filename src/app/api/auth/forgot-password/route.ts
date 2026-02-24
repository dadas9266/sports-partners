import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Güvenlik: kullanıcı yoksa da başarı döndür (email enumeration önleme)
    if (!user) {
      return NextResponse.json({ success: true, message: "E-posta gönderildi" });
    }

    // Önceki kullanılmamış tokenları iptal et
    await prisma.passwordResetToken.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Yeni token oluştur (1 saat geçerli)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, email, expiresAt },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/sifre-sifirla/${token}`;

    // TODO: Gerçek e-posta gönderimi için Resend veya Nodemailer entegrasyonu
    // Şimdilik konsola yazdır (geliştirme ortamı)
    logger.info(`[Şifre Sıfırlama] ${email} için link: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: "E-posta gönderildi",
      // Geliştirme ortamında link'i döndür
      ...(process.env.NODE_ENV === "development" && { devLink: resetUrl }),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0].message }, { status: 400 });
    }
    logger.error("forgot-password hata:", err);
    return NextResponse.json({ success: false, error: "Bir hata oluştu" }, { status: 500 });
  }
}
