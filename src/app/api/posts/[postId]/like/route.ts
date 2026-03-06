import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("api:posts:like");

const VALID_REACTIONS = ["like", "fire", "muscle", "clap", "goal"] as const;
type Reaction = (typeof VALID_REACTIONS)[number];

const REACTION_LABELS: Record<Reaction, string> = {
  like: "beğendi",
  fire: "ateşledi 🔥",
  muscle: "güçlü buldu 💪",
  clap: "alkışladı 👏",
  goal: "gol dedi ⚽",
};

// POST /api/posts/[postId]/like  → beğen / beğeniyi geri al (toggle) + reactions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  // Body'den reaction oku — yoksa "like"
  let reaction: Reaction = "like";
  try {
    const body = await req.json();
    if (body?.reaction && VALID_REACTIONS.includes(body.reaction)) {
      reaction = body.reaction;
    }
  } catch {
    // Body boş olabilir — varsayılan "like"
  }

  try {
    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      if (existing.reaction === reaction) {
        // Aynı reaction → beğeniyi geri al
        await prisma.postLike.delete({ where: { id: existing.id } });
        const count = await prisma.postLike.count({ where: { postId } });
        return NextResponse.json({ liked: false, reaction: null, likeCount: count });
      } else {
        // Farklı reaction → güncelle
        await prisma.postLike.update({
          where: { id: existing.id },
          data: { reaction },
        });
        const count = await prisma.postLike.count({ where: { postId } });
        return NextResponse.json({ liked: true, reaction, likeCount: count });
      }
    } else {
      // Yeni beğeni
      await prisma.postLike.create({ data: { postId, userId, reaction } });
      const count = await prisma.postLike.count({ where: { postId } });

      // Bildirim gönder (kendi gönderine beğeni atarsa bildirim gitmesin)
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });

      if (post && post.userId !== userId) {
        const liker = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        await createNotification({
          userId: post.userId,
          type: "NEW_POST_LIKE",
          title: "Gönderiniz beğenildi",
          body: `${liker?.name ?? "Birisi"} gönderinizi ${REACTION_LABELS[reaction]}`,
          link: `/profil/${post.userId}`,
        });
      }

      return NextResponse.json({ liked: true, reaction, likeCount: count });
    }
  } catch (err) {
    log.error("Like toggle hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
