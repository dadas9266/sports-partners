/**
 * Kullanıcı profilindeki eksik alanları döndürür.
 */
export function getMissingProfileFields(user: {
  avatarUrl?: string | null;
  phone?: string | null;
  birthDate?: string | Date | null;
  userType?: string;
}): string[] {
  const missing: string[] = [];
  if (!user.avatarUrl) missing.push("Profil fotoğrafı");
  if (!user.phone) missing.push("Telefon numarası");
  if (!user.birthDate && user.userType !== "VENUE") missing.push("Doğum tarihi");
  return missing;
}
