import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/api-utils";
import { checkRateLimit, rateLimitResponse, getClientIP } from "@/lib/rate-limit";
import {
  uploadFile,
  deleteFile,
  STORAGE_BUCKETS,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  getAvatarPath,
  getCoverPath,
  getEquipmentPath,
  getCertificatePath,
  getPostImagePath,
  StorageBucket,
} from "@/lib/storage";
import { createLogger } from "@/lib/logger";
import { cacheDel, cacheKey } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

const log = createLogger("api:upload");

type UploadType = "avatar" | "cover" | "equipment" | "certificate" | "post";

function getBucketForType(type: UploadType): StorageBucket {
  switch (type) {
    case "avatar": return STORAGE_BUCKETS.AVATARS;
    case "cover": return STORAGE_BUCKETS.COVERS;
    case "equipment": return STORAGE_BUCKETS.EQUIPMENT;
    case "certificate": return STORAGE_BUCKETS.CERTIFICATES;
    case "post": return STORAGE_BUCKETS.POSTS;
  }
}

function getMaxSizeForType(type: UploadType): number {
  return MAX_FILE_SIZES[type];
}

function getAllowedTypesForType(type: UploadType): string[] {
  if (type === "certificate") return ALLOWED_DOC_TYPES;
  return ALLOWED_IMAGE_TYPES;
}

// POST /api/upload
// FormData: type (UploadType), file (File), index? (number), resourceId? (string)
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 upload/saat
  const ip = getClientIP(req);
  const rl = checkRateLimit(`${userId}:${ip}`, "upload");
  if (!rl.allowed) return rateLimitResponse(rl.remaining);

  // Supabase env kontrolü
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Storage servisi yapılandırılmamış" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const type = formData.get("type") as UploadType;
    const file = formData.get("file") as File | null;
    const index = parseInt((formData.get("index") as string) ?? "0");
    const resourceId = formData.get("resourceId") as string | null;

    if (!type || !file) {
      return NextResponse.json({ error: "type ve file zorunlu" }, { status: 400 });
    }

    const validTypes: UploadType[] = ["avatar", "cover", "equipment", "certificate", "post"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Geçersiz upload tipi" }, { status: 400 });
    }

    // Dosya boyutu kontrolü
    const maxSize = getMaxSizeForType(type);
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Dosya çok büyük. Maksimum: ${Math.round(maxSize / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    // Dosya tipi kontrolü
    const allowedTypes = getAllowedTypesForType(type);
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Geçersiz dosya tipi. İzin verilenler: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop() ?? "jpg";
    const bucket = getBucketForType(type);
    let path = "";

    switch (type) {
      case "avatar":
        path = getAvatarPath(userId, extension);
        break;
      case "cover":
        path = getCoverPath(userId, extension);
        break;
      case "equipment":
        if (!resourceId) return NextResponse.json({ error: "resourceId zorunlu" }, { status: 400 });
        path = getEquipmentPath(resourceId, index, extension);
        break;
      case "certificate":
        path = getCertificatePath(userId, index, extension);
        break;
      case "post":
        if (!resourceId) return NextResponse.json({ error: "resourceId zorunlu" }, { status: 400 });
        path = getPostImagePath(resourceId, index, extension);
        break;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, error } = await uploadFile(bucket, path, buffer, file.type);

    if (error) {
      log.error("Dosya yükleme hatası", { error, type, userId });
      return NextResponse.json({ error: "Dosya yüklenemedi" }, { status: 500 });
    }

    // Avatar veya cover yüklenirse User tablosunu güncelle
    if (type === "avatar") {
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
      await cacheDel(cacheKey.profile(userId));
    }
    if (type === "cover") {
      await prisma.user.update({ where: { id: userId }, data: { coverUrl: url } });
      await cacheDel(cacheKey.profile(userId));
    }

    log.info("Dosya yüklendi", { type, userId, url });
    return NextResponse.json({ url });
  } catch (err) {
    log.error("Upload hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/upload?bucket=avatars&path=...
export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket") as StorageBucket;
  const path = searchParams.get("path");

  if (!bucket || !path) {
    return NextResponse.json({ error: "bucket ve path zorunlu" }, { status: 400 });
  }

  // Güvenlik: path kullanıcı ID'siyle başlamalı (başkasının dosyasını silemesin)
  if (!path.startsWith(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const success = await deleteFile(bucket, path);
  if (!success) {
    return NextResponse.json({ error: "Dosya silinemedi" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
