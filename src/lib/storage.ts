import { createClient } from "@supabase/supabase-js";

// Bucket isimleri - tüm proje genelinde tutarlı kullanım için
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",           // Profil fotoğrafları
  COVERS: "covers",             // Kapak fotoğrafları
  EQUIPMENT: "equipment",       // Satılık malzeme görselleri
  CERTIFICATES: "certificates", // Eğitmen sertifikaları
  POSTS: "posts",               // Sosyal gönderi görselleri
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// Public client (browser tarafı - anonim yükleme için)
export function getSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}

// Admin client (server tarafı - güvenli işlemler için)
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

// Dosya yükle (server-side, admin client ile)
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<{ url: string; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType,
      upsert: true, // Aynı path'e yeniden yüklemeye izin ver
    });

    if (error) return { url: "", error: error.message };

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    return { url: "", error: String(err) };
  }
}

// Dosya sil
export async function deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return !error;
  } catch {
    return false;
  }
}

// Public URL oluştur
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

// Dosya boyutu (byte cinsinden) - maksimum izin verilen
export const MAX_FILE_SIZES = {
  avatar: 2 * 1024 * 1024,       // 2MB
  cover: 5 * 1024 * 1024,        // 5MB
  equipment: 5 * 1024 * 1024,    // 5MB
  certificate: 10 * 1024 * 1024, // 10MB
  post: 5 * 1024 * 1024,         // 5MB
} as const;

// İzin verilen dosya tipleri
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Kullanıcı avatar path'i üret
export function getAvatarPath(userId: string, extension: string = "jpg"): string {
  return `${userId}/avatar.${extension}`;
}

// Kapak fotoğrafı path'i
export function getCoverPath(userId: string, extension: string = "jpg"): string {
  return `${userId}/cover.${extension}`;
}

// Malzeme görseli path'i
export function getEquipmentPath(listingId: string, index: number, extension: string = "jpg"): string {
  return `${listingId}/${index}.${extension}`;
}

// Sertifika path'i
export function getCertificatePath(userId: string, index: number, extension: string = "pdf"): string {
  return `${userId}/cert_${index}.${extension}`;
}

// Gönderi görseli path'i
export function getPostImagePath(postId: string, index: number, extension: string = "jpg"): string {
  return `${postId}/${index}.${extension}`;
}
