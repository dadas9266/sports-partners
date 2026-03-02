import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";

// GET /api/follows?type=followers|following
// Returns paginated list of followers or following for the current user
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "followers"; // "followers" | "following"

    if (type === "followers") {
      const rows = await prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              bio: true,
              userType: true,
              trainerProfile: { select: { isVerified: true } },
            },
          },
        },
      });
      return NextResponse.json({
        success: true,
        users: rows.map((r) => ({ ...r.follower, followId: r.id })),
      });
    } else {
      // following
      const rows = await prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              bio: true,
              userType: true,
              trainerProfile: { select: { isVerified: true } },
            },
          },
        },
      });
      return NextResponse.json({
        success: true,
        users: rows.map((r) => ({ ...r.following, followId: r.id })),
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
