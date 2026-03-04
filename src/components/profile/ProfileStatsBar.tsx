interface ProfileStatsBarProps {
  matchCount: number;
  avgRating?: number | null;
  followerCount: number;
  totalPoints: number;
}

const XP_TIERS = [
  { icon: "🔒", label: "Başlangıç", min: 0,   max: 50 },
  { icon: "🥉", label: "Bronz",     min: 50,  max: 100 },
  { icon: "🥈", label: "Gümüş",    min: 100, max: 200 },
  { icon: "🥇", label: "Altın",    min: 200, max: 400 },
  { icon: "💎", label: "Diamond",  min: 400, max: null },
] as const;

export default function ProfileStatsBar({
  matchCount,
  avgRating,
  followerCount,
  totalPoints,
}: ProfileStatsBarProps) {
  const tier =
    [...XP_TIERS].reverse().find((t) => totalPoints >= t.min) ?? XP_TIERS[0];
  const pct =
    tier.max !== null
      ? Math.min(100, Math.round(((totalPoints - tier.min) / (tier.max - tier.min)) * 100))
      : 100;

  return (
    <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      {/* XP progress */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{tier.icon}</span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{tier.label}</span>
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{totalPoints} XP</span>
        {tier.max !== null && (
          <span className="text-[10px] text-gray-400">({tier.max - totalPoints} kaldı)</span>
        )}
      </div>
    </div>
  );
}
