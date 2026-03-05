import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("settings:privacy");

const privacySchema = z.object({
  whoCanMessage: z.enum(["EVERYONE", "FOLLOWERS", "NOBODY"]).optional(),
  whoCanChallenge: z.enum(["EVERYONE", "FOLLOWERS", "NOBODY"]).optional(),
  profileVisibility: z.enum(["EVERYONE", "FOLLOWERS", "NOBODY"]).optional(),
  showOnLeaderboard: z.boolean().optional(),
  isPrivateProfile: z.boolean().optional(),
});

// GET /api/settings/privacy — aktif kullanıcının gizlilik ayarlarını getir
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const user = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        whoCanMessage: true,
        whoCanChallenge: true,
        profileVisibility: true,
        showOnLeaderboard: true,
        isPrivateProfile: true,
      },
    });

    if (!user) return unauthorized();
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    log.error("Gizlilik ayarları yüklenemedi", error);
    return NextResponse.json({ success: false, error: "Yüklenemedi" }, { status: 500 });
  }
}

// PUT /api/settings/privacy — gizlilik ayarlarını güncelle
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const parsed = privacySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await (prisma.user as any).update({
      where: { id: userId },
      data: parsed.data,
      select: {
        whoCanMessage: true,
        whoCanChallenge: true,
        profileVisibility: true,
        showOnLeaderboard: true,
        isPrivateProfile: true,
      },
    });

    log.info("Gizlilik ayarları güncellendi", { userId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error("Gizlilik ayarları güncellenemedi", error);
    return NextResponse.json({ success: false, error: "Güncellenemedi" }, { status: 500 });
  }
}
