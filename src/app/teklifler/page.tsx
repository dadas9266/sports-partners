"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { LEVEL_LABELS } from "@/types";

type Challenge = {
  id: string;
  challengeType: "RIVAL" | "PARTNER";
  message: string | null;
  proposedDateTime: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  challenger: { id: string; name: string; avatarUrl: string | null; userLevel: string | null };
  target: { id: string; name: string; avatarUrl: string | null; userLevel: string | null };
  sport: { id: string; name: string; icon: string | null };
  district: { id: string; name: string; city: { name: string } } | null;
};

function AvatarChip({ user }: { user: Challenge["challenger"] }) {
  return (
    <Link href={`/profil/${user.id}`} className="flex items-center gap-2 hover:underline">
      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-lg font-bold text-emerald-700 dark:text-emerald-300 overflow-hidden shrink-0">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          user.name.charAt(0).toUpperCase()
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{user.name}</p>
        {user.userLevel && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{LEVEL_LABELS[user.userLevel as keyof typeof LEVEL_LABELS] ?? user.userLevel}</p>
        )}
      </div>
    </Link>
  );
}

function ChallengeCard({
  challenge,
  direction,
  onAction,
}: {
  challenge: Challenge;
  direction: "received" | "sent";
  onAction: (id: string, action: "ACCEPTED" | "REJECTED") => void;
}) {
  const [loading, setLoading] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const expiresAt = new Date(challenge.expiresAt);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 6 * 60 * 60 * 1000; // < 6 hours

  const handleAction = async (action: "ACCEPTED" | "REJECTED") => {
    setLoading(action);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(action === "ACCEPTED" ? "✅ Teklif kabul edildi!" : "Teklif reddedildi");
        onAction(challenge.id, action);
      } else {
        toast.error(json.error ?? "İşlem başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-3">
      {/* Header: who + sport */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {direction === "received" ? (
            <AvatarChip user={challenge.challenger} />
          ) : (
            <AvatarChip user={challenge.target} />
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            challenge.challengeType === "RIVAL"
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          }`}>
            {challenge.challengeType === "RIVAL" ? "⚔️ Rakip" : "🤝 Partner"}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            {challenge.sport.icon} {challenge.sport.name}
          </span>
        </div>
      </div>

      {/* Details */}
      {challenge.message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 italic">
          &ldquo;{challenge.message}&rdquo;
        </p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {challenge.proposedDateTime && (
          <span className="flex items-center gap-1">
            📅 {format(new Date(challenge.proposedDateTime), "d MMMM yyyy, HH:mm", { locale: tr })}
          </span>
        )}
        {challenge.district && (
          <span className="flex items-center gap-1">
            📍 {challenge.district.name}, {challenge.district.city.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          🕐 {formatDistanceToNow(new Date(challenge.createdAt), { locale: tr, addSuffix: true })}
        </span>
        <span className={`flex items-center gap-1 font-medium ${isExpiringSoon ? "text-red-500 dark:text-red-400" : ""}`}>
          ⏳ {formatDistanceToNow(expiresAt, { locale: tr, addSuffix: true })} sona eriyor
        </span>
      </div>

      {/* Actions (only for received) */}
      {direction === "received" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="primary"
            loading={loading === "ACCEPTED"}
            disabled={loading !== null}
            onClick={() => handleAction("ACCEPTED")}
            className="flex-1"
          >
            ✅ Kabul Et
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={loading === "REJECTED"}
            disabled={loading !== null}
            onClick={() => handleAction("REJECTED")}
            className="flex-1 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            ❌ Reddet
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TekliflerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/giris");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch(`/api/challenges?direction=${tab}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setChallenges(json.data ?? []);
        else toast.error("Teklifler yüklenemedi");
      })
      .catch(() => toast.error("Teklifler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [session, tab]);

  const handleAction = (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">⚔️ Teklifler</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Maç ve partner teklifleri</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab("received")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            tab === "received"
              ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          📥 Gelen Teklifler
          {tab !== "received" && challenges.length > 0 && " "}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            tab === "sent"
              ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          📤 Gönderilen Teklifler
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
              <div className="flex gap-3 items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <span className="text-5xl">{tab === "received" ? "📭" : "📤"}</span>
          <p className="mt-3 text-gray-500 dark:text-gray-400 font-medium">
            {tab === "received" ? "Henüz gelen teklif yok" : "Gönderilen teklif yok"}
          </p>
          {tab === "sent" && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Bir kullanıcı profiline giderek teklif gönderebilirsiniz
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
            {challenges.length} aktif teklif
          </p>
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              direction={tab}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
