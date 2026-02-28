import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("mekan-detail");
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const venue = await prisma.venueProfile.findUnique({
      where: { id },
      select: {
        id:           true,
        businessName: true,
        address:      true,
        description:  true,
        phone:        true,
        website:      true,
        capacity:     true,
        sports:       true,
        equipment:    true,
        images:       true,
        openingHours: true,
        isVerified:   true,
        verifiedAt:   true,
        createdAt:    true,
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        facilities: {
          orderBy: { sportName: "asc" },
          select: {
            id:           true,
            sportName:    true,
            facilityType: true,
            count:        true,
            equipment:    true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: "Mekan bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: venue });
  } catch (error) {
    log.error("Mekan detayı yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
