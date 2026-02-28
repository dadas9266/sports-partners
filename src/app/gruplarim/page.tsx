"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface GroupMembership {
  groupId: string;
  role: string;
  status: string;
  joinedAt: string;
  group: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    sport: { id: string; name: string; icon: string | null } | null;
    city: { id: string; name: string } | null;
    _count: { members: number };
  };
}

export default function GruplarimPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
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
        if (json.success) setMemberships(json.data.myGroups ?? []);
        else toast.error("Gruplar yüklenemedi");
      })
      .catch(() => toast.error("Sunucu hatası"))
      .finally(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myAdminGroups = memberships.filter((m) => m.role === "ADMIN" && m.status === "APPROVED");
  const myMemberGroups = memberships.filter((m) => m.role !== "ADMIN" && m.status === "APPROVED");
  const pendingGroups = memberships.filter((m) => m.status === "PENDING");

  const roleLabel = (role: string) =>
    role === "ADMIN" ? "🛡️ Yönetici" : "👤 Üye";

  const GroupCard = ({ m }: { m: GroupMembership }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/gruplar/${m.group.id}`}
            className="font-semibold text-white hover:text-indigo-400 transition"
          >
            {m.group.name}
          </Link>
          <span className="text-xs text-gray-400">{roleLabel(m.role)}</span>
          {!m.group.isPublic && (
            <span className="text-xs bg-yellow-700/40 text-yellow-300 px-2 py-0.5 rounded-full">🔒 Özel</span>
          )}
          {m.status === "PENDING" && (
            <span className="text-xs bg-orange-700/40 text-orange-300 px-2 py-0.5 rounded-full">⏳ Onay Bekliyor</span>
          )}
        </div>
        {m.group.description && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-1">{m.group.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          {m.group.sport && <span>{m.group.sport.icon} {m.group.sport.name}</span>}
          {m.group.city && <span>📍 {m.group.city.name}</span>}
          <span>👥 {m.group._count.members} üye</span>
          <span>📅 {new Date(m.joinedAt).toLocaleDateString("tr-TR")}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/gruplar/${m.group.id}`}
          className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition"
        >
          Görüntüle
        </Link>
        {m.role === "ADMIN" && m.status === "APPROVED" && (
          <Link
            href={`/grup-yonet/${m.group.id}`}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition"
          >
            ⚙️ Yönet
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 Gruplarım</h1>
          <p className="text-sm text-gray-400 mt-1">Üyesi olduğun tüm spor grupları</p>
        </div>
        <Link
          href="/gruplar"
          className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
        >
          + Yeni Grup Keşfet
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-3">👥</p>
          <p className="text-lg font-medium text-gray-400">Henüz bir gruba üye değilsin</p>
          <p className="text-sm mt-1">Spor gruplarını keşfet ve katıl!</p>
          <Link
            href="/gruplar"
            className="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm transition"
          >
            Grupları Keşfet
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {myAdminGroups.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-400 mb-3">
                🛡️ Yönettiğim Gruplar ({myAdminGroups.length})
              </h2>
              <div className="space-y-3">
                {myAdminGroups.map((m) => <GroupCard key={m.groupId} m={m} />)}
              </div>
            </section>
          )}
          {myMemberGroups.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                👤 Üye Olduğum Gruplar ({myMemberGroups.length})
              </h2>
              <div className="space-y-3">
                {myMemberGroups.map((m) => <GroupCard key={m.groupId} m={m} />)}
              </div>
            </section>
          )}
          {pendingGroups.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-400 mb-3">
                ⏳ Onay Bekleyen Başvurular ({pendingGroups.length})
              </h2>
              <div className="space-y-3">
                {pendingGroups.map((m) => <GroupCard key={m.groupId} m={m} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
