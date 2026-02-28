import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("mekanlar");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport  = searchParams.get("sport")?.trim()  || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit  = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)));
    const skip   = (page - 1) * limit;

    const where: Record<string, unknown> = { isVerified: true };

    if (sport) {
      where.sports = { has: sport };
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { description:  { contains: search, mode: "insensitive" } },
        { address:      { contains: search, mode: "insensitive" } },
      ];
    }

    const [venues, total] = await Promise.all([
      prisma.venueProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
        select: {
          id:           true,
          businessName: true,
          address:      true,
          description:  true,
          sports:       true,
          images:       true,
          openingHours: true,
          capacity:     true,
          isVerified:   true,
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: { select: { facilities: true } },
        },
      }),
      prisma.venueProfile.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: venues, total, page, limit });
  } catch (error) {
    log.error("Mekanlar yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Mekanlar yüklenemedi" }, { status: 500 });
  }
}
