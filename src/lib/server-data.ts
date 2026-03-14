import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListingSummary, Country, Sport } from "@/types";

// Server-side data fetching functions (no cache, direct DB access for SSR)

export async function getInitialListings(countryId?: string): Promise<{
  listings: ListingSummary[];
  total: number;
  pageSize: number;
}> {
  const now = new Date();
  const pageSize = 12;

  // Default filter: Turkey + open listings + not expired
  const where: Prisma.ListingWhereInput = {
    status: "OPEN" as const,
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: [{ type: { in: ["TRAINER", "EQUIPMENT", "VENUE_MEMBERSHIP", "VENUE_CLASS", "VENUE_PRODUCT", "VENUE_SERVICE"] as Prisma.EnumListingTypeFilter["in"] } }, { dateTime: { gte: now } }] },
      // Tüm ilanları göster (cinsiyet filtresi client-side uygulanacak)
    ],
    ...(countryId
      ? {
          OR: [
            { district: { city: { countryId } } },
            { city: { countryId } },
          ],
        }
      : {}),
  };

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: {
        sport: true,
        district: { include: { city: { include: { country: true } } } },
        city: { include: { country: true } },
        venue: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            gender: true,
            birthDate: true,
            preferredTime: true,
            preferredStyle: true,
          },
        },
        _count: { select: { responses: true } },
        equipmentDetail: { select: { price: true, isSold: true } },
        trainerProfile: { select: { hourlyRate: true } },
      },
      orderBy: [{ isQuick: "desc" }, { dateTime: "asc" }],
      take: pageSize,
    }),
  ]);

  const sortedListings = [...listings].sort((a: any, b: any) => {
    const aPriority = (a.type === "RIVAL" || a.type === "PARTNER") ? 0 : 1;
    const bPriority = (b.type === "RIVAL" || b.type === "PARTNER") ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
  });

  return {
    listings: sortedListings as unknown as ListingSummary[],
    total,
    pageSize,
  };
}

export async function getInitialLocations(): Promise<Country[]> {
  const countries = await prisma.country.findMany({
    include: {
      cities: {
        include: {
          districts: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return countries as unknown as Country[];
}

export async function getInitialSports(): Promise<Sport[]> {
  const sports = await prisma.sport.findMany({
    orderBy: { name: "asc" },
  });

  return sports as unknown as Sport[];
}

export async function getPopularListings(limit = 6): Promise<ListingSummary[]> {
  const now = new Date();
  
  const listings = await prisma.listing.findMany({
    where: {
      status: "OPEN",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        // TRAINER/EQUIPMENT ve trainer-only tipler tarihe göre filtrelenmez
        { OR: [{ type: { in: ["TRAINER", "EQUIPMENT", "VENUE_MEMBERSHIP", "VENUE_CLASS", "VENUE_PRODUCT", "VENUE_SERVICE"] as Prisma.EnumListingTypeFilter["in"] } }, { dateTime: { gte: now } }] },
      ],
    },
    include: {
      sport: true,
      district: { include: { city: { include: { country: true } } } },
      city: { include: { country: true } },
      venue: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          gender: true,
          birthDate: true,
          preferredTime: true,
          preferredStyle: true,
        },
      },
      _count: { select: { responses: true } },
      equipmentDetail: { select: { price: true, isSold: true } },
      trainerProfile: { select: { hourlyRate: true } },
    },
    orderBy: [
      { responses: { _count: "desc" } },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return listings as unknown as ListingSummary[];
}

export async function getTurkeyId(): Promise<string | null> {
  const turkey = await prisma.country.findFirst({
    where: { code: "TR" },
    select: { id: true },
  });
  return turkey?.id ?? null;
}
