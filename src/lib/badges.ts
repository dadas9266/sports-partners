export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

interface UserStats {
  totalMatches: number;
  avgRating: number;
  ratingCount: number;
  noShowCount?: number;
  hasBio?: boolean;
  hasCity?: boolean;
  hasSports?: boolean;
  currentStreak?: number;
  longestStreak?: number;
}

export function computeBadges(stats: UserStats): Badge[] {
  const badges: Badge[] = [];

  // Eşleşme sayısı rozetleri
  if (stats.totalMatches >= 1) {
    badges.push({
      id: "first_match",
      label: "İlk Eşleşme",
      icon: "🎯",
      description: "İlk eşleşmeni yaptın!",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    });
  }
  if (stats.totalMatches >= 5) {
    badges.push({
      id: "regular",
      label: "Düzenli Sporcu",
      icon: "🏃",
      description: "5 veya daha fazla eşleşme",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    });
  }
  if (stats.totalMatches >= 10) {
    badges.push({
      id: "veteran",
      label: "Veteran",
      icon: "⭐",
      description: "10 veya daha fazla eşleşme",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    });
  }
  if (stats.totalMatches >= 25) {
    badges.push({
      id: "legend",
      label: "Efsane",
      icon: "🏆",
      description: "25 veya daha fazla eşleşme",
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    });
  }

  // Puan rozetleri
  if (stats.ratingCount >= 3 && stats.avgRating >= 4.5) {
    badges.push({
      id: "top_rated",
      label: "Çok Beğenilen",
      icon: "💫",
      description: "Ortalama 4.5+ puan",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    });
  }
  if (stats.ratingCount >= 5 && stats.avgRating === 5) {
    badges.push({
      id: "perfect",
      label: "Mükemmel",
      icon: "🌟",
      description: "5/5 tam puan",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    });
  }

  // Güvenilirlik rozetleri (Sprint 1)
  if (stats.hasBio && stats.hasCity && stats.hasSports && stats.totalMatches >= 1) {
    badges.push({
      id: "verified_profile",
      label: "Doğrulanmış Profil",
      icon: "✅",
      description: "Profil bilgilerini tamamladı ve en az 1 eşleşme yaptı",
      color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    });
  }
  if (stats.totalMatches >= 10 && stats.ratingCount >= 5 && stats.avgRating >= 4.0) {
    badges.push({
      id: "trusted_partner",
      label: "Güvenilir Sporcu",
      icon: "🛡️",
      description: "10+ eşleşme ve 4.0+ ortalama puan",
      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    });
  }

  // Uyarı rozeti — negatif (Sprint 1)
  if ((stats.noShowCount ?? 0) >= 1) {
    badges.push({
      id: "no_show_warning",
      label: "Gelmedi Uyarısı",
      icon: "⚠️",
      description: `${stats.noShowCount} kez belirtilen etkinliklere gelmedi`,
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    });
  }

  // Seri rozetleri
  if ((stats.currentStreak ?? 0) >= 3) {
    badges.push({
      id: "hot_streak",
      label: "Ateş Hattında",
      icon: "⚡",
      description: "3+ günlük aktif seri",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    });
  }
  if ((stats.currentStreak ?? 0) >= 7) {
    badges.push({
      id: "weekly_warrior",
      label: "Haftalık Savaşçı",
      icon: "🔥",
      description: "7+ günlük kesintisiz seri",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    });
  }
  if ((stats.longestStreak ?? 0) >= 30) {
    badges.push({
      id: "legend_streak",
      label: "Efsane Seri",
      icon: "🌋",
      description: "En az 30 günlük rekor seri",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    });
  }

  return badges;
}
