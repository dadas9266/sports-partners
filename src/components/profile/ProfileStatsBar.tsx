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
    <div className="flex gap-3 mt-4">
      {/* Maç */}
      <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{matchCount}</p>
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">Maç</p>
      </div>

      {/* Puan */}
      <div className="flex-1 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800">
        <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
          {avgRating ? `${avgRating} ⭐` : "—"}
        </p>
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">Puan</p>
      </div>

      {/* Takipçi */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
        <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{followerCount}</p>
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">Takipçi</p>
      </div>

      {/* XP */}
      <div className="flex-1 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-3 text-center border border-violet-100 dark:border-violet-800">
        <div className="flex items-center justify-center gap-1">
          <span className="text-lg">{tier.icon}</span>
          <p className="text-xl font-black text-violet-700 dark:text-violet-300">{totalPoints}</p>
        </div>
        <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-0.5">
          XP · {tier.label}
        </p>
        <div className="mt-1 h-1.5 bg-violet-200 dark:bg-violet-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {tier.max !== null && (
          <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">
            {tier.max - totalPoints} XP kaldı
          </p>
        )}
      </div>
    </div>
  );
}
