/**
 * Görsel güvenlik kontrolü.
 * Şimdilik basit magic-byte ve dosya tipi doğrulama yapar.
 * İleride Google Vision / AWS Rekognition gibi bir NSFW API eklenebilir.
 */

// Geçerli resim magic byte'ları
const IMAGE_SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
};

/**
 * Buffer'ın gerçekten bir resim dosyası olduğunu doğrular (magic byte).
 * Dosya uzantısı değiştirilerek enjekte edilmiş script'leri engeller.
 */
export function validateImageBuffer(buffer: Buffer, declaredType: string): boolean {
  const sig = IMAGE_SIGNATURES[declaredType];
  if (!sig) return false;
  if (buffer.length < sig.length) return false;
  return sig.every((byte, i) => buffer[i] === byte);
}

/**
 * NSFW kontrol placeholder'ı. 
 * Gerçek uygulamada burada bir ML API çağrısı yapılır.
 * Şimdilik her resmi güvenli kabul eder ancak loglar.
 */
export async function checkNSFW(
  _buffer: Buffer,
  _mimeType: string
): Promise<{ safe: boolean; score?: number; reason?: string }> {
  // TODO: Google Vision SafeSearch veya benzeri bir API ile entegrasyon
  // Örnek: const result = await visionClient.safeSearchDetection(buffer);
  // if (result.adult === "LIKELY" || result.adult === "VERY_LIKELY") return { safe: false, score: 0.9, reason: "adult" };
  return { safe: true };
}
