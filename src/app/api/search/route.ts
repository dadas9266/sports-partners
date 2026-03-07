import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("search");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: false, error: "En az 2 karakter girin" }, { status: 400 });
    }

    const term = q.toLowerCase();
    const currentUserId = await getCurrentUserId();

    // Opsiyonel filtreler
    const sportId = searchParams.get("sportId") ?? undefined;
    const cityId = searchParams.get("cityId") ?? undefined;
    const level = searchParams.get("level") ?? undefined;

    // Engellenen kullanıcıların ID'lerini topla
    let blockedIds: string[] = [];
    if (currentUserId) {
      const blocks = await prisma.userBlock.findMany({
        where: {
          OR: [
            { blockerId: currentUserId },
            { blockedId: currentUserId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      });
      blockedIds = blocks.map(b =>
        b.blockerId === currentUserId ? b.blockedId : b.blockerId
      );
    }

    const [listings, users, sports, clubs, groups] = await Promise.all([
      // İlanlar: spor adı, ilçe/şehir adı, mekan adı, açıklama
      prisma.listing.findMany({
        where: {
          status: "OPEN",
          dateTime: { gte: new Date() },
          ...(sportId ? { sportId } : {}),
          ...(cityId ? { cityId } : {}),
          ...(level ? { level: level as any } : {}),
          OR: [
            { sport: { name: { contains: term, mode: "insensitive" } } },
            { district: { name: { contains: term, mode: "insensitive" } } },
            { district: { city: { name: { contains: term, mode: "insensitive" } } } },
            { venue: { name: { contains: term, mode: "insensitive" } } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        },
        include: {
          sport: true,
          district: { include: { city: { include: { country: true } } } },
          venue: true,
          user: { select: { id: true, name: true } },
          _count: { select: { responses: true } },
        },
        orderBy: { dateTime: "asc" },
        take: 10,
      }),

      // Kullanıcılar: isim, bio (engellenenleri hariç tut)
      prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { bio: { contains: term, mode: "insensitive" } },
              ],
            },
            blockedIds.length > 0 ? { id: { notIn: blockedIds } } : {},
          ],
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
          city: { select: { name: true } },
          sports: { select: { name: true, icon: true } },
        },
        take: 5,
      }),

      // Sporlar
      prisma.sport.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        select: { id: true, name: true, icon: true },
        take: 5,
      }),

      // Kulüpler
      prisma.club.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          sport: { select: { name: true, icon: true } },
          city: { select: { name: true } },
          _count: { select: { members: true } },
        },
        take: 5,
      }),

      // Gruplar
      prisma.group.findMany({
        where: {
          isPublic: true,
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          sport: { select: { name: true, icon: true } },
          city: { select: { name: true } },
          _count: { select: { members: true } },
        },
        take: 5,
      }),
    ]);

    log.info("Arama yapıldı", { q, results: listings.length + users.length + clubs.length + groups.length });

    return NextResponse.json({
      success: true,
      data: { listings, users, sports, clubs, groups },
    });
  } catch (error) {
    log.error("Arama hatası", error);
    return NextResponse.json({ success: false, error: "Arama yapılamadı" }, { status: 500 });
  }
}
