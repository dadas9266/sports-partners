"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import CommunityCard, { CommunityCardData } from "@/components/CommunityCard";

interface MyCommunity extends CommunityCardData {
  role: "ADMIN" | "MEMBER";
  myStatus: "APPROVED" | "PENDING" | null;
}

export default function TopluluklarimPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [adminCommunities, setAdminCommunities] = useState<MyCommunity[]>([]);
  const [memberCommunities, setMemberCommunities] = useState<MyCommunity[]>([]);
  const [pendingCommunities, setPendingCommunities] = useState<MyCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/giris");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchMyCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const fetchMyCommunities = async () => {
    setLoading(true);
    try {
      // Fetch communities where current user is a member
      const res = await fetch("/api/communities?myMemberships=true&limit=100");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const all: MyCommunity[] = json.data ?? [];
      setAdminCommunities(all.filter(c => c.role === "ADMIN" && c.myStatus === "APPROVED"));
      setMemberCommunities(all.filter(c => c.role === "MEMBER" && c.myStatus === "APPROVED"));
      setPendingCommunities(all.filter(c => c.myStatus === "PENDING"));
    } catch {
      toast.error("Topluluklar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (id: string) => {
    setLeaving(id);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Topluluktan ayrıldınız");
      fetchMyCommunities();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setLeaving(null);
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = adminCommunities.length === 0 && memberCommunities.length === 0 && pendingCommunities.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topluluklarım</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Üye olduğun tüm topluluklar</p>
          </div>
          <Link
            href="/topluluklar"
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Tümünü Keşfet →
          </Link>
        </div>

        {isEmpty ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="font-medium">Henüz bir topluluğa katılmadın</p>
            <Link
              href="/topluluklar"
              className="mt-3 inline-block px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
            >
              Toplulukları Keşfet
            </Link>
          </div>
        ) : (
          <>
            {/* Admin */}
            {adminCommunities.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  👑 Yönettiğim ({adminCommunities.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {adminCommunities.map(c => (
                    <CommunityCard
                      key={c.id}
                      community={c}
                      onLeave={handleLeave}
                      joining={leaving === c.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Member */}
            {memberCommunities.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  👤 Üye Olduğum ({memberCommunities.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {memberCommunities.map(c => (
                    <CommunityCard
                      key={c.id}
                      community={c}
                      onLeave={handleLeave}
                      joining={leaving === c.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Pending */}
            {pendingCommunities.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  ⏳ Bekleyen Talepler ({pendingCommunities.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingCommunities.map(c => (
                    <CommunityCard key={c.id} community={c} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
