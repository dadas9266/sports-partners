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

  return badges;
}
