import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import {
  listCommunityMembers,
  joinCommunity,
  leaveCommunity,
} from "@/lib/community-service";

const logger = createLogger("community-members");
type Params = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/members
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const { id: communityId } = await params;
    const statusFilter = new URL(req.url).searchParams.get("status") ?? "APPROVED";

    const members = await listCommunityMembers(communityId, {
      callerUserId: userId ?? undefined,
      statusFilter,
    });
    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    logger.error("GET members error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/communities/[id]/members — Join
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId } = await params;
    const result = await joinCommunity(communityId, userId);

    if (result === "notFound") return NextResponse.json({ error: "Topluluk bulunamadı" }, { status: 404 });
    if (result === "alreadyMember") return NextResponse.json({ error: "Zaten üyesiniz" }, { status: 400 });
    if (result === "pendingAlready") return NextResponse.json({ error: "Talebiniz inceleniyor" }, { status: 400 });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    logger.error("POST member join error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/communities/[id]/members — Leave
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId } = await params;
    const result = await leaveCommunity(communityId, userId);

    if (result === "notFound") return NextResponse.json({ error: "Topluluk bulunamadı" }, { status: 404 });
    if (result === "notMember") return NextResponse.json({ error: "Üye değilsiniz" }, { status: 400 });
    if (result === "lastAdmin") return NextResponse.json({ error: "Ayrılmadan önce başka bir üyeyi admin yapın" }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE member leave error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
