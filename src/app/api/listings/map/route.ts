import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Haritada gösterilecek ilanları döndürür (GPS koordinatı olan açık ilanlar)
export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: "OPEN",
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        description: true,
        type: true,
        latitude: true,
        longitude: true,
        sport: { select: { name: true, icon: true } },
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        district: {
          select: {
            name: true,
            city: { select: { name: true } },
          },
        },
      },
      take: 500,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, listings });
  } catch {
    return NextResponse.json({ success: false, listings: [] }, { status: 500 });
  }
}
