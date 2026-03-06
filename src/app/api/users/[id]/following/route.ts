import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("user-following");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    const following = await prisma.follow.findMany({
      where: { 
        followerId: userId,
        status: "ACCEPTED"
      },
      select: {
        following: {
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
      data: following.map(f => f.following)
    });
  } catch (err) {
    log.error("Takip edilen listesi hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
