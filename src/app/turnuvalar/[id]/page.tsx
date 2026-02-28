"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface Participant {
  id: string;
  status: string;
  rank?: number;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

interface Tournament {
  id: string;
  title: string;
  description?: string;
  format: string;
  status: string;
  maxParticipants: number;
  prizeInfo?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  isPublic: boolean;
  creator: { id: string; name: string; avatarUrl?: string };
  sport?: { name: string; icon?: string };
  participants: Participant[];
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  OPEN: "Kayıt Açık",
  ONGOING: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Tek Eleme",
  ROUND_ROBIN: "Herkes Herkesle",
  SWISS: "İsviçre Sistemi",
};

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/turnuvalar/${id}`);
    if (res.ok) setTournament(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isJoined = tournament?.participants.some(
    (p) => p.user.id === session?.user?.id
  );
  const isCreator = tournament?.creator.id === session?.user?.id;

  const handleJoin = async () => {
    if (!session?.user) return router.push("/auth/giris");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/turnuvalar/${id}/katil`, { method: "POST" });
      if (res.ok) {
        toast.success("Kayıt isteği gönderildi!");
        load();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Hata oluştu");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/turnuvalar/${id}/katil`, { method: "DELETE" });
      toast.success("Turnuvadan ayrıldınız");
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/turnuvalar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Durum güncellendi");
        load();
      } else {
        toast.error("Güncelleme başarısız");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-20 text-gray-400">Turnuva bulunamadı.</div>
    );
  }

  const approvedCount = tournament.participants.filter(
    (p) => p.status === "APPROVED"
  ).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link href="/turnuvalar" className="hover:text-emerald-400">
          Turnuvalar
        </Link>{" "}
        / <span className="text-gray-300">{tournament.title}</span>
      </div>

      {/* Başlık */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {tournament.sport && (
                <span className="text-2xl">{tournament.sport.icon ?? "🏅"}</span>
              )}
              <h1 className="text-xl font-bold text-white">{tournament.title}</h1>
            </div>
            <p className="text-sm text-gray-400">
              {FORMAT_LABEL[tournament.format]} •{" "}
              <span className="text-emerald-400">{STATUS_LABEL[tournament.status]}</span>
            </p>
          </div>

          {/* Katıl / Ayrıl */}
          {!isCreator && tournament.status === "OPEN" && (
            <button
              onClick={isJoined ? handleLeave : handleJoin}
              disabled={actionLoading}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isJoined
                  ? "bg-red-900/50 text-red-400 hover:bg-red-900"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              } disabled:opacity-50`}
            >
              {isJoined ? "Ayrıl" : "Katıl"}
            </button>
          )}
        </div>

        {tournament.description && (
          <p className="text-sm text-gray-300 leading-relaxed">
            {tournament.description}
          </p>
        )}

        {/* Bilgi grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Katılımcı</p>
            <p className="text-white font-medium">
              {approvedCount}/{tournament.maxParticipants}
            </p>
          </div>
          {tournament.startsAt && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Başlangıç</p>
              <p className="text-white font-medium">
                {new Date(tournament.startsAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
          {tournament.location && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Konum</p>
              <p className="text-white font-medium">{tournament.location}</p>
            </div>
          )}
          {tournament.prizeInfo && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Ödül</p>
              <p className="text-white font-medium">{tournament.prizeInfo}</p>
            </div>
          )}
        </div>

        {/* Organizatör kontrolleri */}
        {isCreator && (
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Organizatör Kontrolleri
            </p>
            <div className="flex gap-2 flex-wrap">
              {tournament.status === "DRAFT" && (
                <button
                  onClick={() => handleStatus("OPEN")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  Kayıtları Aç
                </button>
              )}
              {tournament.status === "OPEN" && (
                <button
                  onClick={() => handleStatus("ONGOING")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  Turnuvayı Başlat
                </button>
              )}
              {tournament.status === "ONGOING" && (
                <button
                  onClick={() => handleStatus("COMPLETED")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  Tamamla
                </button>
              )}
              {["DRAFT", "OPEN"].includes(tournament.status) && (
                <button
                  onClick={() => handleStatus("CANCELLED")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  İptal Et
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Katılımcı Listesi */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-white">
          Katılımcılar ({tournament.participants.length})
        </h2>

        {tournament.participants.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz katılımcı yok.</p>
        ) : (
          <div className="space-y-2">
            {tournament.participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                    {p.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.user.avatarUrl} alt={p.user.name} className="w-full h-full object-cover" />
                    ) : (
                      p.user.name?.[0]?.toUpperCase()
                    )}
                  </div>
                  <Link
                    href={`/profil/${p.user.id}`}
                    className="text-sm text-gray-200 hover:text-emerald-400"
                  >
                    {p.user.name}
                  </Link>
                  {p.rank != null && (
                    <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full">
                      #{p.rank}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "APPROVED"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : p.status === "PENDING"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {p.status === "APPROVED"
                    ? "Onaylandı"
                    : p.status === "PENDING"
                    ? "Bekliyor"
                    : p.status === "WITHDRAWN"
                    ? "Ayrıldı"
                    : "Reddedildi"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
