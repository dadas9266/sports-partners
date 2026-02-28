import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

const log = createLogger("auth:register");

export async function POST(request: Request) {
  try {
    // IP-based rate limit
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, "register");
    if (!rateCheck.allowed) {
      log.warn("Kayıt rate limit aşıldı", { ip });
      return NextResponse.json(
        { success: false, error: "Çok fazla kayıt denemesi. Lütfen bir süre bekleyin." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, phone, gender, birthDate, cityId, districtId } = parsed.data;

    // E-posta kontrolü
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu e-posta adresi zaten kayıtlı" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        cityId,
        districtId,
        gender: gender as any,
        birthDate: birthDate ? new Date(birthDate) : null,
        userType: "INDIVIDUAL" as any,
      } as any,
    });

    log.info("Yeni kullanıcı kaydedildi", { userId: user.id, email });

    return NextResponse.json(
      {
        success: true,
        data: { id: user.id, name: user.name, email: user.email },
      },
      { status: 201 }
    );
  } catch (error) {
    log.error("Kayıt sırasında hata", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
