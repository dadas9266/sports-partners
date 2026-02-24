"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getLeaderboard, getSports } from "@/services/api";
import type { LeaderboardEntry, Sport, Badge } from "@/types";

function BadgeChip({ badge }: { badge: Badge }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}
      title={badge.description}
    >
      {badge.icon} {badge.label}
    </span>
  );
}

function StarDisplay({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={s <= Math.round(value) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}>
            ★
          </span>
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{value.toFixed(1)}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">({count})</span>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LiderlikPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSports()
      .then((res) => { if (res.success && res.data) setSports(res.data); })
      .catch(() => {/* ignore */});
  }, []);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(selectedSport || undefined, 20)
      .then((res) => { if (res.success && res.data) setEntries(res.data); })
      .catch(() => toast.error("Liderlik tablosu yüklenemedi"))
      .finally(() => setLoading(false));
  }, [selectedSport]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">🏅 Liderlik Tablosu</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">En yüksek puanlı sporcular</p>
      </div>

      {/* Sport filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button
          onClick={() => setSelectedSport("")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            selectedSport === ""
              ? "bg-emerald-500 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-400"
          }`}
        >
          🏆 Tümü
        </button>
        {sports.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedSport === sport.id
                ? "bg-emerald-500 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-400"
            }`}
          >
            {sport.icon} {sport.name}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-6xl">😕</span>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Bu spor için henüz veri yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <Link
              key={entry.id}
              href={`/profil/${entry.id}`}
              className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition"
            >
              {/* Sıralama */}
              <div className="w-10 text-center shrink-0">
                {idx < 3 ? (
                  <span className="text-2xl">{MEDALS[idx]}</span>
                ) : (
                  <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden ${
                idx === 0
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 ring-2 ring-yellow-400"
                  : idx === 1
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-500 ring-2 ring-gray-400"
                  : idx === 2
                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 ring-2 ring-orange-400"
                  : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                ) : (
                  entry.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Bilgiler */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{entry.name}</span>
                  {entry.city && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">📍 {entry.city.name}</span>
                  )}
                </div>

                {/* Sporlar */}
                {entry.sports.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.sports.slice(0, 3).map((s) => (
                      <span key={s.id} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                        {s.icon} {s.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rozetler */}
                {entry.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.badges.map((b) => (
                      <BadgeChip key={b.id} badge={b} />
                    ))}
                  </div>
                )}
              </div>

              {/* Puan + istatistik */}
              <div className="text-right shrink-0">
                <StarDisplay value={entry.avgRating} count={entry.ratingCount} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  🤝 {entry.totalMatches} eşleşme
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
