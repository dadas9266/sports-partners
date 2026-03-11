"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchAll } from "@/services/api";
import type { SearchResults } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

const HISTORY_KEY = "sp_search_history";
const MAX_HISTORY = 8;

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
  catch { return []; }
}
function saveHistory(term: string) {
  if (!term.trim()) return;
  const next = [term, ...getHistory().filter(h => h !== term)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}
function clearHistory() { localStorage.removeItem(HISTORY_KEY); }

export default function AramaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 400);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
    if (!initialQ) inputRef.current?.focus();
  }, [initialQ]);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) { setResults(null); return; }
    setLoading(true);
    setError("");
    try {
      const res = await searchAll(term);
      if (res.success) {
        setResults(res.data ?? null);
        saveHistory(term);
        setHistory(getHistory());
        router.replace(`/arama?q=${encodeURIComponent(term)}`, { scroll: false });
      } else {
        setError(res.error ?? "Arama yapılamadı");
      }
    } catch {
      setError("Arama yapılamadı");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const totalResults = results
    ? results.listings.length + results.users.length + results.sports.length + results.clubs.length + results.groups.length
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Arama Kutusu */}
      <div className="relative mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowHistory(false); }}
            onFocus={() => { if (!query && history.length > 0) setShowHistory(true); }}
            onBlur={() => setTimeout(() => setShowHistory(false), 150)}
            placeholder="İlan, kullanıcı, kulüp, grup veya spor dalı ara…"
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-base"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults(null); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Geçmiş Dropdown */}
        {showHistory && history.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Son Aramalar</span>
              <button onClick={handleClearHistory} className="text-xs text-red-400 hover:text-red-500">Temizle</button>
            </div>
            {history.map(h => (
              <button
                key={h}
                onMouseDown={() => handleHistoryClick(h)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <span className="text-gray-400">🕐</span> {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Durum */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">Aranıyor…</p>
        </div>
      )}
      {error && <p className="text-center text-red-500 py-8">{error}</p>}

      {/* Boş Durum */}
      {!loading && !results && !query && history.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">📜 Son Aramalar</p>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <button
                key={h}
                onClick={() => setQuery(h)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
      {!loading && !results && !query && (
        <div className="text-center py-10 space-y-6">
          <p className="text-5xl mb-2">🔍</p>
          <p className="text-gray-500 dark:text-gray-400 text-lg">İlan, kullanıcı, kulüp veya spor dalı aramaya başlayın</p>
        </div>
      )}
      {/* Hızlı Erişim — her zaman, sorgu yokken göster */}
      {!query && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto py-4">
          <Link href="/liderlik" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:shadow-md transition">
            <span className="text-2xl">🏆</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Liderlik</span>
          </Link>
          <Link href="/topluluklar" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:shadow-md transition">
            <span className="text-2xl">👥</span>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Topluluklar</span>
          </Link>
          <Link href="/kulupler" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition">
            <span className="text-2xl">🏟️</span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Kulüpler</span>
          </Link>
        </div>
      )}

      {/* Sonuçlar */}
      {results && !loading && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{debouncedQuery}&rdquo;</span> için {totalResults} sonuç
          </p>

          {totalResults === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">😔</p>
              <p className="text-gray-500 dark:text-gray-400">Sonuç bulunamadı</p>
            </div>
          )}

          {/* İlanlar */}
          {results.listings.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">📋 İlanlar ({results.listings.length})</h2>
              <div className="space-y-2">
                {results.listings.map(l => (
                  <Link
                    key={l.id}
                    href={`/ilan/${l.id}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition group"
                  >
                    <span className="text-2xl">{l.sport.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{l.sport.name} — {l.district ? `${l.district.city.name}, ${l.district.name}` : l.city?.name ?? ""}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{l.user.name} · {l.level}</p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(l.dateTime).toLocaleDateString("tr-TR")}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Kullanıcılar */}
          {results.users.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">👤 Kullanıcılar ({results.users.length})</h2>
              <div className="space-y-2">
                {results.users.map(u => (
                  <Link
                    key={u.id}
                    href={`/profil/${u.id}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition"
                  >
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg font-bold text-emerald-700 dark:text-emerald-300">{u.name?.[0]}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.city?.name}{u.sports.length > 0 ? ` · ${u.sports.map(s => `${s.icon} ${s.name}`).join(", ")}` : ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Kulüpler */}
          {results.clubs.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">🏆 Kulüpler ({results.clubs.length})</h2>
              <div className="space-y-2">
                {results.clubs.map(c => (
                  <Link
                    key={c.id}
                    href={`/kulupler/${c.id}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition"
                  >
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg">🏆</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.sport ? `${c.sport.icon} ${c.sport.name}` : ""}{c.city ? ` · ${c.city.name}` : ""} · {c._count.members} üye</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Gruplar */}
          {results.groups.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">👥 Gruplar ({results.groups.length})</h2>
              <div className="space-y-2">
                {results.groups.map(g => (
                  <Link
                    key={g.id}
                    href={`/gruplar/${g.id}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg">👥</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{g.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{g.sport ? `${g.sport.icon} ${g.sport.name}` : ""}{g.city ? ` · ${g.city.name}` : ""} · {g._count.members} üye</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Sporlar */}
          {results.sports.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">🏅 Spor Dalları ({results.sports.length})</h2>
              <div className="flex flex-wrap gap-2">
                {results.sports.map(s => (
                  <Link
                    key={s.id}
                    href={`/?sportId=${s.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 text-sm text-gray-700 dark:text-gray-300 transition"
                  >
                    <span>{s.icon}</span> {s.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
