import type { Badge } from "@/types";

export type AppLocale = "tr" | "en" | "ru" | "de" | "fr" | "es" | "ja" | "ko";

const SUPPORTED_LOCALES: AppLocale[] = ["tr", "en", "ru", "de", "fr", "es", "ja", "ko"];

function fallbackLocale(locale?: string): AppLocale {
  return SUPPORTED_LOCALES.includes((locale ?? "") as AppLocale) ? (locale as AppLocale) : "tr";
}

const SPORT_NAME_LABELS: Record<string, Partial<Record<AppLocale, string>>> = {
  "Futbol": { tr: "Futbol", en: "Football", ru: "Футбол", de: "Fussball", fr: "Football", es: "Futbol", ja: "サッカー", ko: "축구" },
  "Basketbol": { tr: "Basketbol", en: "Basketball", ru: "Баскетбол", de: "Basketball", fr: "Basket", es: "Baloncesto", ja: "バスケットボール", ko: "농구" },
  "Tenis": { tr: "Tenis", en: "Tennis", ru: "Теннис", de: "Tennis", fr: "Tennis", es: "Tenis", ja: "テニス", ko: "테니스" },
  "Voleybol": { tr: "Voleybol", en: "Volleyball", ru: "Волейбол", de: "Volleyball", fr: "Volley", es: "Voleibol", ja: "バレーボール", ko: "배구" },
  "Masa Tenisi": { tr: "Masa Tenisi", en: "Table Tennis", ru: "Настольный теннис", de: "Tischtennis", fr: "Tennis de table", es: "Tenis de mesa", ja: "卓球", ko: "탁구" },
  "Yüzme": { tr: "Yüzme", en: "Swimming", ru: "Плавание", de: "Schwimmen", fr: "Natation", es: "Natacion", ja: "水泳", ko: "수영" },
  "Koşu": { tr: "Koşu", en: "Running", ru: "Бег", de: "Laufen", fr: "Course", es: "Running", ja: "ランニング", ko: "러닝" },
  "Yürüyüş": { tr: "Yürüyüş", en: "Walking", ru: "Ходьба", de: "Spazieren", fr: "Marche", es: "Caminata", ja: "ウォーキング", ko: "걷기" },
  "Bisiklet": { tr: "Bisiklet", en: "Cycling", ru: "Велоспорт", de: "Radfahren", fr: "Cyclisme", es: "Ciclismo", ja: "サイクリング", ko: "사이클링" },
  "Kaykay / Paten": { tr: "Kaykay / Paten", en: "Skateboarding / Rollerblading", ru: "Скейт / Ролики", de: "Skateboard / Inlineskaten", fr: "Skate / Roller", es: "Skate / Patines", ja: "スケートボード / ローラー", ko: "스케이트보드 / 롤러" },
  "Squash": { tr: "Squash", en: "Squash", ru: "Сквош", de: "Squash", fr: "Squash", es: "Squash", ja: "スカッシュ", ko: "스쿼시" },
  "Pickleball": { tr: "Pickleball", en: "Pickleball", ru: "Пиклбол", de: "Pickleball", fr: "Pickleball", es: "Pickleball", ja: "ピックルボール", ko: "피클볼" },
  "Padel": { tr: "Padel", en: "Padel", ru: "Падел", de: "Padel", fr: "Padel", es: "Padel", ja: "パデル", ko: "파델" },
  "Balık Tutma": { tr: "Balık Tutma", en: "Fishing", ru: "Рыбалка", de: "Angeln", fr: "Peche", es: "Pesca", ja: "釣り", ko: "낚시" },
  "Hiking (Doğa Yürüyüşü)": { tr: "Doğa Yürüyüşü", en: "Hiking", ru: "Поход", de: "Wandern", fr: "Randonnee", es: "Senderismo", ja: "ハイキング", ko: "하이킹" },
  "Bilardo": { tr: "Bilardo", en: "Billiards", ru: "Бильярд", de: "Billard", fr: "Billard", es: "Billar", ja: "ビリヤード", ko: "당구" },
  "Dart": { tr: "Dart", en: "Darts", ru: "Дартс", de: "Darts", fr: "Fléchettes", es: "Dardos", ja: "ダーツ", ko: "다트" },
  "Yoga": { tr: "Yoga", en: "Yoga", ru: "Йога", de: "Yoga", fr: "Yoga", es: "Yoga", ja: "ヨガ", ko: "요가" },
  "Pilates": { tr: "Pilates", en: "Pilates", ru: "Пилатес", de: "Pilates", fr: "Pilates", es: "Pilates", ja: "ピラティス", ko: "필라테스" },
  "Dans": { tr: "Dans", en: "Dance", ru: "Танцы", de: "Tanz", fr: "Danse", es: "Baile", ja: "ダンス", ko: "댄스" },
  "Fitness": { tr: "Fitness", en: "Fitness", ru: "Фитнес", de: "Fitness", fr: "Fitness", es: "Fitness", ja: "フィットネス", ko: "피트니스" },
};

const COMPETITIVE_LEVEL_LABELS: Record<AppLocale, Record<string, string>> = {
  tr: { BEGINNER: "Acemi", AMATEUR: "Amatör", SEMI_PRO: "Yarı Pro", PRO: "⚡ Pro" },
  en: { BEGINNER: "Rookie", AMATEUR: "Amateur", SEMI_PRO: "Semi-Pro", PRO: "⚡ Pro" },
  ru: { BEGINNER: "Новичок", AMATEUR: "Любитель", SEMI_PRO: "Полупро", PRO: "⚡ Профи" },
  de: { BEGINNER: "Einsteiger", AMATEUR: "Amateur", SEMI_PRO: "Halbprofi", PRO: "⚡ Profi" },
  fr: { BEGINNER: "Debutant", AMATEUR: "Amateur", SEMI_PRO: "Semi-pro", PRO: "⚡ Pro" },
  es: { BEGINNER: "Principiante", AMATEUR: "Aficionado", SEMI_PRO: "Semipro", PRO: "⚡ Pro" },
  ja: { BEGINNER: "初心者", AMATEUR: "アマチュア", SEMI_PRO: "セミプロ", PRO: "⚡ プロ" },
  ko: { BEGINNER: "입문", AMATEUR: "아마추어", SEMI_PRO: "세미프로", PRO: "⚡ 프로" },
};

const BADGE_LABELS: Record<AppLocale, Record<string, { label: string; description: string }>> = {
  tr: {
    first_match: { label: "İlk Eşleşme", description: "İlk eşleşmeni yaptın!" },
    regular: { label: "Düzenli Sporcu", description: "5 veya daha fazla eşleşme" },
    veteran: { label: "Veteran", description: "10 veya daha fazla eşleşme" },
    legend: { label: "Efsane", description: "25 veya daha fazla eşleşme" },
    top_rated: { label: "Çok Beğenilen", description: "Ortalama 4.5+ puan" },
    perfect: { label: "Mükemmel", description: "5/5 tam puan" },
    verified_profile: { label: "Doğrulanmış Profil", description: "Profil bilgilerini tamamladı ve en az 1 eşleşme yaptı" },
    trusted_partner: { label: "Güvenilir Sporcu", description: "10+ eşleşme ve 4.0+ ortalama puan" },
    no_show_warning: { label: "Gelmedi Uyarısı", description: "{count} kez belirtilen etkinliklere gelmedi" },
    hot_streak: { label: "Ateş Hattında", description: "3+ günlük aktif seri" },
    weekly_warrior: { label: "Haftalık Savaşçı", description: "7+ günlük kesintisiz seri" },
    legend_streak: { label: "Efsane Seri", description: "En az 30 günlük rekor seri" },
  },
  en: {
    first_match: { label: "First Match", description: "You completed your first match!" },
    regular: { label: "Regular Athlete", description: "5 or more matches" },
    veteran: { label: "Veteran", description: "10 or more matches" },
    legend: { label: "Legend", description: "25 or more matches" },
    top_rated: { label: "Top Rated", description: "Average score 4.5+" },
    perfect: { label: "Perfect", description: "A perfect 5/5 rating" },
    verified_profile: { label: "Verified Profile", description: "Completed profile info and finished at least 1 match" },
    trusted_partner: { label: "Trusted Athlete", description: "10+ matches and 4.0+ average rating" },
    no_show_warning: { label: "No-Show Warning", description: "Missed scheduled activities {count} time(s)" },
    hot_streak: { label: "On Fire", description: "Active for 3+ days in a row" },
    weekly_warrior: { label: "Weekly Warrior", description: "7+ days streak" },
    legend_streak: { label: "Legendary Streak", description: "At least a 30-day record streak" },
  },
  ru: {
    first_match: { label: "Первый матч", description: "Ты завершил свой первый матч!" },
    regular: { label: "Регулярный спортсмен", description: "5 и более матчей" },
    veteran: { label: "Ветеран", description: "10 и более матчей" },
    legend: { label: "Легенда", description: "25 и более матчей" },
    top_rated: { label: "Высокий рейтинг", description: "Средняя оценка 4.5+" },
    perfect: { label: "Идеально", description: "Безупречная оценка 5/5" },
    verified_profile: { label: "Проверенный профиль", description: "Заполнил профиль и сыграл минимум 1 матч" },
    trusted_partner: { label: "Надежный спортсмен", description: "10+ матчей и средняя оценка 4.0+" },
    no_show_warning: { label: "Предупреждение о неявке", description: "Пропустил запланированные активности {count} раз(а)" },
    hot_streak: { label: "На серии", description: "Активность 3+ дня подряд" },
    weekly_warrior: { label: "Воин недели", description: "Серия 7+ дней" },
    legend_streak: { label: "Легендарная серия", description: "Рекордная серия не менее 30 дней" },
  },
  de: {
    first_match: { label: "Erstes Match", description: "Du hast dein erstes Match abgeschlossen!" },
    regular: { label: "Regelmaessiger Sportler", description: "5 oder mehr Matches" },
    veteran: { label: "Veteran", description: "10 oder mehr Matches" },
    legend: { label: "Legende", description: "25 oder mehr Matches" },
    top_rated: { label: "Top bewertet", description: "Durchschnitt 4.5+" },
    perfect: { label: "Perfekt", description: "Perfekte 5/5 Bewertung" },
    verified_profile: { label: "Verifiziertes Profil", description: "Profil vervollstaendigt und mindestens 1 Match gespielt" },
    trusted_partner: { label: "Verlaesslicher Sportler", description: "10+ Matches und 4.0+ Durchschnitt" },
    no_show_warning: { label: "No-Show Warnung", description: "{count} Mal nicht erschienen" },
    hot_streak: { label: "Heisse Serie", description: "3+ Tage in Folge aktiv" },
    weekly_warrior: { label: "Wochen-Champion", description: "7+ Tage Serie" },
    legend_streak: { label: "Legendare Serie", description: "Mindestens 30 Tage Rekordserie" },
  },
  fr: {
    first_match: { label: "Premier match", description: "Tu as termine ton premier match !" },
    regular: { label: "Sportif regulier", description: "5 matchs ou plus" },
    veteran: { label: "Veteran", description: "10 matchs ou plus" },
    legend: { label: "Legende", description: "25 matchs ou plus" },
    top_rated: { label: "Tres apprecie", description: "Note moyenne 4.5+" },
    perfect: { label: "Parfait", description: "Note parfaite de 5/5" },
    verified_profile: { label: "Profil verifie", description: "Profil complete et au moins 1 match joue" },
    trusted_partner: { label: "Sportif fiable", description: "10+ matchs et moyenne 4.0+" },
    no_show_warning: { label: "Alerte absence", description: "Absence a {count} activite(s) prevue(s)" },
    hot_streak: { label: "En feu", description: "Actif 3+ jours d'affilee" },
    weekly_warrior: { label: "Guerrier hebdo", description: "Serie de 7+ jours" },
    legend_streak: { label: "Serie legendaire", description: "Serie record d'au moins 30 jours" },
  },
  es: {
    first_match: { label: "Primer partido", description: "Completaste tu primer partido!" },
    regular: { label: "Deportista constante", description: "5 o mas partidos" },
    veteran: { label: "Veterano", description: "10 o mas partidos" },
    legend: { label: "Leyenda", description: "25 o mas partidos" },
    top_rated: { label: "Muy valorado", description: "Promedio 4.5+" },
    perfect: { label: "Perfecto", description: "Calificacion perfecta de 5/5" },
    verified_profile: { label: "Perfil verificado", description: "Completo el perfil y jugo al menos 1 partido" },
    trusted_partner: { label: "Deportista confiable", description: "10+ partidos y promedio 4.0+" },
    no_show_warning: { label: "Aviso de ausencia", description: "Falto a actividades programadas {count} vez/veces" },
    hot_streak: { label: "En racha", description: "Activo durante 3+ dias seguidos" },
    weekly_warrior: { label: "Guerrero semanal", description: "Racha de 7+ dias" },
    legend_streak: { label: "Racha legendaria", description: "Racha record de al menos 30 dias" },
  },
  ja: {
    first_match: { label: "初マッチ", description: "最初のマッチを達成しました！" },
    regular: { label: "常連アスリート", description: "5試合以上" },
    veteran: { label: "ベテラン", description: "10試合以上" },
    legend: { label: "レジェンド", description: "25試合以上" },
    top_rated: { label: "高評価", description: "平均4.5以上" },
    perfect: { label: "パーフェクト", description: "5/5の満点評価" },
    verified_profile: { label: "認証プロフィール", description: "プロフィールを完成し、少なくとも1試合をプレイ" },
    trusted_partner: { label: "信頼できる選手", description: "10試合以上かつ平均4.0以上" },
    no_show_warning: { label: "無断欠席警告", description: "予定された活動を{count}回欠席" },
    hot_streak: { label: "好調", description: "3日以上連続でアクティブ" },
    weekly_warrior: { label: "週間ウォリアー", description: "7日以上の連続記録" },
    legend_streak: { label: "伝説の連続記録", description: "30日以上の最長連続記録" },
  },
  ko: {
    first_match: { label: "첫 매치", description: "첫 매치를 완료했어요!" },
    regular: { label: "꾸준한 스포츠인", description: "5경기 이상" },
    veteran: { label: "베테랑", description: "10경기 이상" },
    legend: { label: "레전드", description: "25경기 이상" },
    top_rated: { label: "높은 평점", description: "평균 평점 4.5+" },
    perfect: { label: "퍼펙트", description: "완벽한 5/5 평점" },
    verified_profile: { label: "검증된 프로필", description: "프로필을 완성하고 최소 1경기를 진행함" },
    trusted_partner: { label: "신뢰받는 스포츠인", description: "10+ 경기와 평균 4.0+ 평점" },
    no_show_warning: { label: "노쇼 경고", description: "예정된 활동에 {count}회 불참" },
    hot_streak: { label: "상승세", description: "3일 이상 연속 활동" },
    weekly_warrior: { label: "주간 워리어", description: "7일 이상 연속 기록" },
    legend_streak: { label: "전설의 연속 기록", description: "최소 30일의 최고 연속 기록" },
  },
};

export function getCompetitiveLevelLabel(level: string, locale?: string): string {
  const safeLocale = fallbackLocale(locale);
  return COMPETITIVE_LEVEL_LABELS[safeLocale][level] ?? COMPETITIVE_LEVEL_LABELS.tr[level] ?? level;
}

export function localizeBadge(badge: Badge, locale?: string): Badge {
  const safeLocale = fallbackLocale(locale);
  const translated = BADGE_LABELS[safeLocale][badge.id];

  if (!translated) return badge;

  const countMatch = badge.description.match(/\d+/);
  const count = countMatch?.[0] ?? "0";

  return {
    ...badge,
    label: translated.label,
    description: translated.description.replace("{count}", count),
  };
}

export function resolveAppLocale(locale?: string): AppLocale {
  return fallbackLocale(locale);
}

export function localizeSportName(sportName: string, locale?: string): string {
  const safeLocale = fallbackLocale(locale);
  const labels = SPORT_NAME_LABELS[sportName];
  if (!labels) return sportName;

  return labels[safeLocale] ?? labels.en ?? labels.tr ?? sportName;
}