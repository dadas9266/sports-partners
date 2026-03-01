interface Sport {
  id: string;
  icon: string;
  name: string;
}

interface ProfileSportsStripProps {
  sports: Sport[];
  preferredTime?: string | null;
  preferredStyle?: string | null;
}

const TIME_LABELS: Record<string, string> = {
  morning: "🌅 Sabah",
  evening: "🌙 Akşam",
  anytime: "⏰ Her Zaman",
};

const STYLE_LABELS: Record<string, string> = {
  competitive: "🏆 Rekabetçi",
  casual: "😊 Eğlenceli",
  both: "⚡ Her İkisi",
};

export default function ProfileSportsStrip({
  sports,
  preferredTime,
  preferredStyle,
}: ProfileSportsStripProps) {
  const hasContent = preferredTime || preferredStyle || sports.length > 0;
  if (!hasContent) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 mb-4 shadow-sm">
      <div className="flex flex-wrap gap-2 items-center">
        {sports.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800"
          >
            {s.icon} {s.name}
          </span>
        ))}

        {preferredTime && (
          <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-sky-100 dark:border-sky-800">
            {TIME_LABELS[preferredTime] ?? preferredTime}
          </span>
        )}

        {preferredStyle && (
          <span className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-violet-100 dark:border-violet-800">
            {STYLE_LABELS[preferredStyle] ?? preferredStyle}
          </span>
        )}
      </div>
    </div>
  );
}
