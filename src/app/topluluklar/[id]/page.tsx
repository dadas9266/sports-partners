"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Member {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: { id: string; name: string | null; avatarUrl: string | null };
}

interface Community {
  id: string;
  type: "GROUP" | "CLUB" | "TEAM";
  name: string;
  description: string | null;
  avatarUrl: string | null;
  website: string | null;
  isPrivate: boolean;
  createdAt: string;
  sport: { id: string; name: string; icon: string | null } | null;
  city: { id: string; name: string } | null;
  creator: { id: string; name: string | null; avatarUrl: string | null };
  _count: { members: number };
}

const TYPE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  GROUP: { label: "Grup", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", emoji: "👥" },
  CLUB:  { label: "Kulüp", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", emoji: "🏛️" },
  TEAM:  { label: "Takım", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", emoji: "⚽" },
};

export default function CommunityDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const { data: session } = useSession();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myStatus, setMyStatus] = useState<"APPROVED" | "PENDING" | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cRes, mRes] = await Promise.all([
          fetch(`/api/communities/${id}`),
          fetch(`/api/communities/${id}/members`),
        ]);
        const cJson = await cRes.json();
        const mJson = await mRes.json();

        if (!cRes.ok) { toast.error(cJson.error ?? "Topluluk yüklenemedi"); return; }
        setCommunity(cJson.data);

        if (mRes.ok) {
          const memberList: Member[] = mJson.data ?? [];
          setMembers(memberList.filter((m) => m.status === "APPROVED"));
          if (session?.user?.id) {
            const mine = memberList.find((m) => m.user.id === session.user.id);
            if (mine) setMyStatus(mine.status as "APPROVED" | "PENDING");
          }
        }
      } catch {
        toast.error("Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.user?.id]);

  const handleJoin = async () => {
    if (!session) { router.push("/auth/giris"); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const status = json.data?.status === "PENDING" ? "PENDING" : "APPROVED";
      setMyStatus(status);
      toast.success(status === "PENDING" ? "Katılma talebiniz gönderildi" : "Topluluğa katıldınız!");
      if (community) setCommunity({ ...community, _count: { members: community._count.members + 1 } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMyStatus(null);
      setMembers((prev) => prev.filter((m) => m.user.id !== session?.user?.id));
      if (community) setCommunity({ ...community, _count: { members: Math.max(0, community._count.members - 1) } });
      toast.success("Topluluktan ayrıldınız");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">😕</div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Topluluk bulunamadı</p>
        <Link href="/topluluklar" className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors">
          Tüm Topluluklara Dön
        </Link>
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[community.type] ?? TYPE_LABELS.GROUP;
  const isCreator = session?.user?.id === community.creator.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/topluluklar"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          ← Tüm Topluluklar
        </Link>

        {/* Header card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-4xl overflow-hidden">
              {community.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                typeInfo.emoji
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeInfo.color}`}>
                  {typeInfo.emoji} {typeInfo.label}
                </span>
                {community.isPrivate && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                    🔒 Gizli
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{community.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                {community.sport && (
                  <span>{community.sport.icon} {community.sport.name}</span>
                )}
                {community.city && (
                  <span>📍 {community.city.name}</span>
                )}
                <span>👤 {community._count.members} üye</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2">
              {!isCreator && (
                myStatus === "APPROVED" ? (
                  <button
                    onClick={handleLeave}
                    disabled={joining}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {joining ? "..." : "Ayrıl"}
                  </button>
                ) : myStatus === "PENDING" ? (
                  <span className="px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-sm font-medium">
                    ⏳ Onay Bekleniyor
                  </span>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {joining ? "..." : community.isPrivate ? "Katılma Talebi Gönder" : "Katıl"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Description */}
          {community.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{community.description}</p>
          )}

          {/* Website */}
          {community.website && (
            <a
              href={community.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              🌐 {community.website.replace(/^https?:\/\//, "")}
            </a>
          )}

          {/* Creator */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs overflow-hidden">
              {community.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (community.creator.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
            <span>
              Oluşturan:{" "}
              <Link href={`/profil/${community.creator.id}`} className="hover:text-emerald-500 transition-colors">
                {community.creator.name ?? "Kullanıcı"}
              </Link>
            </span>
            <span className="ml-auto">
              {new Date(community.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Üyeler{members.length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({members.length})</span>}
          </h2>

          {members.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Henüz üye yok</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map((m) => (
                <Link
                  key={m.id}
                  href={`/profil/${m.user.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (m.user.name?.[0] ?? "?").toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {m.user.name ?? "Kullanıcı"}
                      {m.user.id === community.creator.id && (
                        <span className="ml-1.5 text-xs text-yellow-600 dark:text-yellow-400">👑 Kurucu</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {m.role === "ADMIN" ? "Yönetici" : "Üye"} · {new Date(m.joinedAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
