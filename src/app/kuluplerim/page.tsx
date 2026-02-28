"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface ClubMembership {
  clubId: string;
  role: string;
  status: string;
  joinedAt: string;
  club: {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    sport: { id: string; name: string; icon: string | null } | null;
    city: { id: string; name: string } | null;
    _count: { members: number };
  };
}

export default function KuluplerimPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/giris");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMemberships(json.data.myClubs ?? []);
        else toast.error("Kulüpler yüklenemedi");
      })
      .catch(() => toast.error("Sunucu hatası"))
      .finally(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const captainClubs = memberships.filter((m) => m.role === "CAPTAIN" && m.status === "APPROVED");
  const memberClubs = memberships.filter((m) => m.role !== "CAPTAIN" && m.status === "APPROVED");
  const pendingClubs = memberships.filter((m) => m.status === "PENDING");

  const roleLabel = (role: string) =>
    role === "CAPTAIN" ? "🏆 Kaptan" : "👤 Üye";

  const ClubCard = ({ m }: { m: ClubMembership }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/kulupler/${m.club.id}`}
            className="font-semibold text-white hover:text-emerald-400 transition"
          >
            {m.club.name}
          </Link>
          <span className="text-xs text-gray-400">{roleLabel(m.role)}</span>
          {m.status === "PENDING" && (
            <span className="text-xs bg-orange-700/40 text-orange-300 px-2 py-0.5 rounded-full">⏳ Onay Bekliyor</span>
          )}
        </div>
        {m.club.description && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-1">{m.club.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          {m.club.sport && <span>{m.club.sport.icon} {m.club.sport.name}</span>}
          {m.club.city && <span>📍 {m.club.city.name}</span>}
          <span>👥 {m.club._count.members} üye</span>
          {m.club.website && (
            <a href={m.club.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
              🌐 Web
            </a>
          )}
          <span>📅 {new Date(m.joinedAt).toLocaleDateString("tr-TR")}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/kulupler/${m.club.id}`}
          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition"
        >
          Görüntüle
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🏅 Kulüplerim</h1>
          <p className="text-sm text-gray-400 mt-1">Üyesi olduğun tüm spor kulüpleri</p>
        </div>
        <Link
          href="/kulupler"
          className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
        >
          + Yeni Kulüp Keşfet
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-3">🏅</p>
          <p className="text-lg font-medium text-gray-400">Henüz bir kulübe üye değilsin</p>
          <p className="text-sm mt-1">Spor kulüplerini keşfet ve katıl!</p>
          <Link
            href="/kulupler"
            className="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm transition"
          >
            Kulüpleri Keşfet
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {captainClubs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400 mb-3">
                🏆 Kaptanı Olduğum Kulüpler ({captainClubs.length})
              </h2>
              <div className="space-y-3">
                {captainClubs.map((m) => <ClubCard key={m.clubId} m={m} />)}
              </div>
            </section>
          )}
          {memberClubs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                👤 Üye Olduğum Kulüpler ({memberClubs.length})
              </h2>
              <div className="space-y-3">
                {memberClubs.map((m) => <ClubCard key={m.clubId} m={m} />)}
              </div>
            </section>
          )}
          {pendingClubs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-400 mb-3">
                ⏳ Onay Bekleyen Başvurular ({pendingClubs.length})
              </h2>
              <div className="space-y-3">
                {pendingClubs.map((m) => <ClubCard key={m.clubId} m={m} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
