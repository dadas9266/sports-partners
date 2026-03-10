import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { withCache, cacheKey, CACHE_TTL } from "@/lib/cache";

const log = createLogger("venues");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get("districtId");

    if (!districtId) {
      return NextResponse.json(
        { success: false, error: "İlçe ID gerekli" },
        { status: 400 }
      );
    }

    const venues = await withCache(
      cacheKey.venues(districtId),
      CACHE_TTL.VENUES,
      () => prisma.venue.findMany({
        where: { districtId },
        orderBy: { name: "asc" },
      })
    );

    return NextResponse.json({ success: true, data: venues });
  } catch (error) {
    log.error("Mekanlar yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Mekanlar yüklenemedi" },
      { status: 500 }
    );
  }
}
