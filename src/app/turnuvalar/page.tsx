"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Tournament {
  id: string;
  title: string;
  description?: string;
  format: string;
  status: string;
  maxParticipants: number;
  startsAt?: string;
  location?: string;
  coverImage?: string;
  creator: { id: string; name: string; avatarUrl?: string };
  sport?: { name: string; icon?: string };
  _count: { participants: number };
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  OPEN: "Kayıt Açık",
  ONGOING: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  OPEN: "bg-emerald-900/60 text-emerald-300",
  ONGOING: "bg-blue-900/60 text-blue-300",
  COMPLETED: "bg-purple-900/60 text-purple-300",
  CANCELLED: "bg-red-900/60 text-red-400",
};

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Tek Eleme",
  ROUND_ROBIN: "Herkes Herkesle",
  SWISS: "İsviçre",
};

export default function TurnuvalarPage() {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/turnuvalar${qs}`);
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Turnuvalar</h1>
          <p className="text-sm text-gray-400 mt-1">
            Spor turnuvalarını keşfet ve kayıt ol
          </p>
        </div>
        {session?.user && (
          <Link
            href="/turnuvalar/yeni"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Turnuva Oluştur
          </Link>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        {["", "OPEN", "ONGOING", "COMPLETED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {s ? STATUS_LABEL[s] : "Tümü"}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🏆</p>
          <p>Henüz turnuva yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/turnuvalar/${t.id}`}
              className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden hover:border-emerald-600 transition-colors group"
            >
              {/* Kapak */}
              <div className="h-32 bg-gradient-to-br from-emerald-900/40 to-gray-900 flex items-center justify-center">
                {t.sport ? (
                  <span className="text-5xl">{t.sport.icon ?? "🏅"}</span>
                ) : (
                  <span className="text-5xl">🏆</span>
                )}
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {t.title}
                  </h3>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>

                <p className="text-xs text-gray-400">{FORMAT_LABEL[t.format]}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {t._count.participants}/{t.maxParticipants} katılımcı
                  </span>
                  {t.startsAt && (
                    <span>
                      {new Date(t.startsAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
