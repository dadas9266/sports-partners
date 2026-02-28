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

type FriendEntry = {
  id: string; name: string; avatarUrl: string | null;
  userLevel: string; currentStreak: number; longestStreak: number;
  totalMatches: number; totalPoints: number; avgRating: number;
  ratingCount: number; sports: { name: string; icon: string | null }[];
  isMe: boolean; rank: number;
};

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Acemi", AMATEUR: "Amatör", SEMI_PRO: "Yarı Pro", PRO: "⚡ Pro",
};
const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-gray-100 text-gray-600", AMATEUR: "bg-green-100 text-green-700",
  SEMI_PRO: "bg-purple-100 text-purple-700", PRO: "bg-amber-100 text-amber-700",
};

export default function LiderlikPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"global" | "friends">("global");
  const [friendEntries, setFriendEntries] = useState<FriendEntry[]>([]);

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

  useEffect(() => {
    if (mode !== "friends") return;
    setLoading(true);
    fetch("/api/leaderboard/friends")
      .then(r => r.json())
      .then(d => { if (d.rankings) setFriendEntries(d.rankings); })
      .catch(() => toast.error("Arkadaş sıralaması yüklenemedi"))
      .finally(() => setLoading(false));
  }, [mode]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">🏅 Liderlik Tablosu</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">En yüksek puanlı sporcular</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          <button onClick={() => setMode("global")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "global" ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}>
            🏆 Global
          </button>
          <button onClick={() => setMode("friends")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "friends" ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}>
            👥 Arkadaşlar
          </button>
        </div>
      </div>

      {/* Sport filter tabs — sadece global modda */}
      {mode === "global" && (<div className="flex flex-wrap gap-2 mb-6 justify-center">
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
      </div>)}

      {/* Arkadaş Sıralaması */}
      {mode === "friends" && !loading && (
        <div className="space-y-3">
          {friendEntries.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-6xl">👥</span>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Takip ettiğin kimse yok</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sporcuları takip ederek arkadaş sıralamasına katıl</p>
            </div>
          ) : friendEntries.map((entry) => (
            <Link key={entry.id} href={`/profil/${entry.id}`}
              className={`flex items-center gap-4 rounded-xl border p-4 hover:shadow-md transition ${
                entry.isMe
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700"
                  : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
              }`}>
              <div className="w-10 text-center shrink-0">
                {entry.rank <= 3 ? <span className="text-2xl">{MEDALS[entry.rank - 1]}</span> : <span className="text-lg font-bold text-gray-400">#{entry.rank}</span>}
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden">
                {entry.avatarUrl ? <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" /> : entry.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{entry.name}</span>
                  {entry.isMe && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">Sen</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[entry.userLevel] || "bg-gray-100 text-gray-600"}`}>
                    {LEVEL_LABELS[entry.userLevel] || entry.userLevel}
                  </span>
                  {/* Puan Rozeti */}
                  {typeof entry.totalPoints === "number" && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 animate-fade-in" title="Toplam Puan">
                      {entry.totalPoints >= 400 ? "💎" : entry.totalPoints >= 200 ? "🥇" : entry.totalPoints >= 100 ? "🥈" : entry.totalPoints >= 50 ? "🥉" : "🔒"}
                      {entry.totalPoints} puan
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>🔥 {entry.currentStreak} gün seri</span>
                  <span>🤝 {entry.totalMatches} maç</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-violet-700 dark:text-violet-300">{entry.totalPoints}</p>
                <p className="text-xs text-gray-400">XP</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Global Liste */}
      {mode === "global" && (
      <>
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
          {/* Top-3 Podium */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-6">
              {/* 2. Sıra - Gümüş */}
              <Link href={`/profil/${entries[1].id}`} className="flex-1 max-w-[30%] group">
                <div className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-t-2xl rounded-b-xl border-2 border-gray-300 dark:border-gray-600 p-3 text-center shadow-md hover:shadow-lg transition h-36 flex flex-col justify-between">
                  <span className="text-2xl">🥈</span>
                  <div className="w-12 h-12 rounded-full mx-auto overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-lg border-2 border-gray-400">
                    {entries[1].avatarUrl ? <img src={entries[1].avatarUrl} alt={entries[1].name} className="w-full h-full object-cover" /> : entries[1].name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{entries[1].name}</p>
                    <p className="text-sm font-black text-gray-600 dark:text-gray-300">{entries[1].totalPoints} XP</p>
                  </div>
                </div>
                <div className="h-8 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-b-lg mx-1" />
              </Link>
              {/* 1. Sıra - Altın */}
              <Link href={`/profil/${entries[0].id}`} className="flex-1 max-w-[34%] group">
                <div className="bg-gradient-to-b from-yellow-100 to-amber-200 dark:from-yellow-900/60 dark:to-amber-900/40 rounded-t-2xl rounded-b-xl border-2 border-yellow-400 dark:border-yellow-600 p-3 text-center shadow-xl hover:shadow-2xl transition h-44 flex flex-col justify-between ring-2 ring-yellow-300 dark:ring-yellow-700">
                  <span className="text-3xl">🥇</span>
                  <div className="w-14 h-14 rounded-full mx-auto overflow-hidden bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center font-bold text-xl border-2 border-yellow-500">
                    {entries[0].avatarUrl ? <img src={entries[0].avatarUrl} alt={entries[0].name} className="w-full h-full object-cover" /> : entries[0].name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-yellow-200 truncate">{entries[0].name}</p>
                    <p className="text-base font-black text-amber-700 dark:text-yellow-300">{entries[0].totalPoints} XP</p>
                  </div>
                </div>
                <div className="h-12 bg-gradient-to-b from-yellow-400 to-amber-500 dark:from-yellow-700 dark:to-amber-800 rounded-b-lg mx-1" />
              </Link>
              {/* 3. Sıra - Bronz */}
              <Link href={`/profil/${entries[2].id}`} className="flex-1 max-w-[30%] group">
                <div className="bg-gradient-to-b from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/30 rounded-t-2xl rounded-b-xl border-2 border-orange-300 dark:border-orange-700 p-3 text-center shadow-md hover:shadow-lg transition h-32 flex flex-col justify-between">
                  <span className="text-2xl">🥉</span>
                  <div className="w-11 h-11 rounded-full mx-auto overflow-hidden bg-orange-200 dark:bg-orange-800 flex items-center justify-center font-bold border-2 border-orange-400">
                    {entries[2].avatarUrl ? <img src={entries[2].avatarUrl} alt={entries[2].name} className="w-full h-full object-cover" /> : entries[2].name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-900 dark:text-orange-200 truncate">{entries[2].name}</p>
                    <p className="text-sm font-black text-orange-700 dark:text-orange-300">{entries[2].totalPoints} XP</p>
                  </div>
                </div>
                <div className="h-5 bg-gradient-to-b from-orange-300 to-orange-400 dark:from-orange-700 dark:to-orange-800 rounded-b-lg mx-1" />
              </Link>
            </div>
          )}

          {/* Tam Liste */}
          {entries.map((entry, idx) => (
            <Link
              key={entry.id}
              href={`/profil/${entry.id}`}
              className={`flex items-center gap-4 rounded-xl border p-4 hover:shadow-md transition ${
                idx === 0
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700"
                  : idx === 1
                  ? "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-600"
                  : idx === 2
                  ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-700"
                  : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
              }`}
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
                  {/* XP Tier */}
                  {typeof entry.totalPoints === "number" && (
                    <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700" title="XP Turu">
                      {entry.totalPoints >= 400 ? "💎" : entry.totalPoints >= 200 ? "🥇" : entry.totalPoints >= 100 ? "🥈" : entry.totalPoints >= 50 ? "🥉" : "🔒"}
                      {" "}{entry.totalPoints}
                    </span>
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
                {entry.currentStreak > 0 && (
                  <p className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                    {entry.currentStreak >= 7 ? "🔥" : "⚡"} {entry.currentStreak} gün
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
