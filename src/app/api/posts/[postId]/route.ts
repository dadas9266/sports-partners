import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

// GET /api/posts/[postId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const currentUserId = await getCurrentUserId();
  const { postId } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, isPrivateProfile: true } },
        _count: { select: { likes: true, comments: true } },
        likes: {
          where: { userId: currentUserId || "" },
          select: { reaction: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
    }

    // GİZLİLİK KONTROLÜ
    if (post.user.isPrivateProfile && post.user.id !== currentUserId) {
        // Eğer giriş yapılmamışsa direkt reddet
        if (!currentUserId) {
            return NextResponse.json({ error: "Bu gönderiyi görmek için giriş yapmalısınız." }, { status: 403 });
        }

        // Takip edip etmediğini kontrol et
        const follow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: currentUserId,
                    followingId: post.user.id
                }
            }
        });
        
        // Takip yoksa veya onaylı değilse gizle
        if (!follow || follow.status !== "APPROVED") {
            return NextResponse.json({ error: "Bu gönderi gizli bir profile ait." }, { status: 403 });
        }
    }

    const formattedPost = {
      ...post,
      liked: post.likes.length > 0,
      userReaction: post.likes[0]?.reaction || null,
      likes: []
    };

    return NextResponse.json({ success: true, post: formattedPost });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/posts/[postId]
