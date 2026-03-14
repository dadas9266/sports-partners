/**
 * Kullanıcı profilindeki eksik alanları döndürür.
 */
export function getMissingProfileFields(user: {
  name?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  birthDate?: string | Date | null;
  sports?: unknown[] | null;
}): string[] {
  const missing: string[] = [];
  if (!user.name?.trim()) missing.push("Ad soyad");
  if (!user.avatarUrl) missing.push("Profil fotoğrafı");
  if (!user.phone) missing.push("Telefon numarası");
  if (!user.birthDate) missing.push("Doğum tarihi");
  if (!user.sports || user.sports.length === 0) missing.push("En az 1 spor dalı");
  return missing;
}

/**
 * İlan açma ve başvuru yapma için minimum profil tamamlama kontrolü.
 * Minimum gereksinimler: Ad, doğum tarihi, en az 1 spor dalı.
 * Profil fotoğrafı ve telefon tavsiye edilir ama zorunlu değil.
 */
export function getRequiredProfileFields(user: {
  name?: string | null;
  birthDate?: string | Date | null;
  sports?: unknown[] | null;
}): string[] {
  const missing: string[] = [];
  if (!user.name?.trim()) missing.push("Ad soyad");
  if (!user.birthDate) missing.push("Doğum tarihi");
  if (!user.sports || user.sports.length === 0) missing.push("En az 1 spor dalı");
  return missing;
}
