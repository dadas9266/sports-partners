import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("user-followers");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    const followers = await prisma.follow.findMany({
      where: { 
        followingId: userId,
        status: "ACCEPTED"
      },
      select: {
        follower: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      data: followers.map(f => f.follower)
    });
  } catch (err) {
    log.error("Takipçi listesi hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
