interface ProfileStreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export default function ProfileStreakCard({ currentStreak, longestStreak }: ProfileStreakCardProps) {
  const streakEmoji = currentStreak >= 7 ? "🔥" : currentStreak >= 3 ? "⚡" : "✨";
  const weekProgress = currentStreak % 7;
  const filledDots = currentStreak > 0 && weekProgress === 0 ? 7 : weekProgress;
  const nextMilestone =
    currentStreak < 3  ? 3  :
    currentStreak < 7  ? 7  :
    currentStreak < 14 ? 14 :
    currentStreak < 30 ? 30 : null;
  const toNext = nextMilestone !== null ? nextMilestone - currentStreak : 0;

  return (
    <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg select-none">{streakEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {currentStreak} gün seri
            </p>
            <p className="text-xs text-gray-400">Rekor: {longestStreak} gün</p>
          </div>
        </div>

        {/* Weekly dots */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                d <= filledDots
                  ? "bg-orange-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {nextMilestone !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentStreak / nextMilestone) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{toNext} gün kaldı</span>
        </div>
      )}
      {nextMilestone === null && currentStreak >= 30 && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
          🌋 Efsane seri! {currentStreak} gün kesintisiz
        </p>
      )}
    </div>
  );
}
