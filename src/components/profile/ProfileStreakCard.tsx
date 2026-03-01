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
    <div className="mt-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-2xl select-none ${currentStreak >= 7 ? "animate-bounce" : ""}`}
          >
            {streakEmoji}
          </span>
          <div>
            <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
              {currentStreak} Günlük Seri
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Rekor: {longestStreak} gün</p>
          </div>
        </div>

        {/* Haftalık ilerleme noktaları */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              className={`w-5 h-5 rounded-full border-2 transition-colors duration-300 ${
                d <= filledDots
                  ? "bg-orange-500 border-orange-600 shadow-sm shadow-orange-300 dark:shadow-orange-800"
                  : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              }`}
            />
          ))}
        </div>
      </div>

      {nextMilestone !== null ? (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-orange-600 dark:text-orange-400 mb-1">
            <span>{currentStreak} / {nextMilestone} gün</span>
            <span>🎯 {toNext} gün kaldı</span>
          </div>
          <div className="h-1.5 bg-orange-200 dark:bg-orange-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentStreak / nextMilestone) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 text-center">
          🌋 Efsane Seri! {currentStreak} gün kesintisiz!
        </p>
      )}
    </div>
  );
}
