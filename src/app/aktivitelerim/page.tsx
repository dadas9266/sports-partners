"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";

// ─── Tipler ────────────────────────────────────────────────────────────────────
type SportSnip     = { id: string; name: string; icon: string | null };
type DistrictSnip  = { name: string; city: { name: string } } | null;
type UserSnip      = { id: string; name: string; avatarUrl: string | null };

type MyListing = {
  id: string; type: string; status: string;
  dateTime: string; createdAt: string;
  sport: SportSnip; district: DistrictSnip;
  _count: { responses: number };
};

type MyResponse = {
  id: string; status: string; message: string | null; createdAt: string;
  listing: {
    id: string; type: string; status: string; dateTime: string;
    sport: SportSnip; district: DistrictSnip; user: UserSnip;
  };
};

type MyMatch = {
  id: string; status: string;
  scheduledAt: string | null; completedAt: string | null;
  trustScore: number; approvedById: string | null;
  iHaveConfirmed: boolean; iHaveRated: boolean;
  createdAt: string;
  user1: UserSnip; user2: UserSnip;
  listing: {
    id: string; type: string; dateTime: string;
    sport: SportSnip; district: DistrictSnip;
  } | null;
  _count: { messages: number };
};

type Challenge = {
  id: string; challengeType: "RIVAL" | "PARTNER";
  message: string | null; proposedDateTime: string | null;
  status: string; createdAt: string; expiresAt: string;
  challenger: UserSnip & { userLevel: string | null };
  target: UserSnip & { userLevel: string | null };
  sport: SportSnip;
  district: { name: string; city: { name: string } } | null;
};

// ─── Yardımcı badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  MATCHED:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CLOSED:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ONGOING:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  PENDING:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  REJECTED:  "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık", MATCHED: "Eşleşti", CLOSED: "Kapandı", CANCELLED: "İptal",
  SCHEDULED: "Planlandı", ONGOING: "Devam Ediyor", COMPLETED: "Tamamlandı",
  PENDING: "Bekliyor", ACCEPTED: "Kabul Edildi", REJECTED: "Reddedildi",
};
const TYPE_LABELS: Record<string, string> = {
  RIVAL: "⚔️ Rakip", PARTNER: "🤝 Partner", TRAINER: "🎓 Antrenör", EQUIPMENT: "🏋️ Ekipman",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Avatar({ user }: { user: UserSnip }) {
  return (
    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 overflow-hidden shrink-0 border border-emerald-200 dark:border-emerald-700">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        : user.name?.[0]?.toUpperCase()}
    </div>
  );
}

// ─── Sayfa ──────────────────────────────────────────────────────────────────────
type TabKey = "listings" | "responses" | "matches" | "challenges";

export default function AktivitelerimPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as TabKey) ?? "matches";
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);

  const [listings, setListings]   = useState<MyListing[]>([]);
  const [responses, setResponses] = useState<MyResponse[]>([]);
  const [matches, setMatches]     = useState<MyMatch[]>([]);
  const [challenges, setChallenges] = useState<{ received: Challenge[]; sent: Challenge[] }>({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/giris");
  }, [authStatus, router]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [aktRes, recRes, sentRes] = await Promise.all([
        fetch("/api/aktivitelerim").then((r) => r.json()),
        fetch("/api/challenges?direction=received").then((r) => r.json()),
        fetch("/api/challenges?direction=sent").then((r) => r.json()),
      ]);
      if (aktRes.success) {
        setListings(aktRes.data.listings ?? []);
        setResponses(aktRes.data.responses ?? []);
        setMatches(aktRes.data.matches ?? []);
      }
      setChallenges({
        received: recRes.success ? recRes.data ?? [] : [],
        sent:     sentRes.success ? sentRes.data ?? [] : [],
      });
    } catch {
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const handleChallengeAction = async (id: string, action: "ACCEPTED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(action === "ACCEPTED" ? "✅ Teklif kabul edildi!" : "Teklif reddedildi");
        setChallenges((prev) => ({
          ...prev,
          received: prev.received.filter((c) => c.id !== id),
        }));
      } else {
        toast.error(json.error ?? "İşlem başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  const setTab = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/aktivitelerim?tab=${tab}`, { scroll: false });
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const pendingChallenges = challenges.received.length;
  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "matches",    label: "Eşleşmeler",   icon: "🤝", count: matches.filter((m) => m.status !== "COMPLETED").length },
    { key: "listings",   label: "İlanlarım",     icon: "📋", count: listings.filter((l) => l.status === "OPEN").length },
    { key: "responses",  label: "Başvurularım",  icon: "📩", count: responses.filter((r) => r.status === "PENDING").length },
    { key: "challenges", label: "Teklifler",     icon: "⚔️", count: pendingChallenges },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aktivitelerim</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">İlanlarını, başvurularını, eşleşmelerini ve tekliflerini tek yerden yönet.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <span className="hidden sm:inline">{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
            {(tab.count ?? 0) > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                {tab.count! > 9 ? "9+" : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Eşleşmeler ──────────────────────────────────────────────────── */}
      {activeTab === "matches" && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <EmptyState icon="🤝" text="Henüz eşleşmen yok." />
          ) : (
            matches.map((m) => {
              const opponent = m.user1.id === session?.user?.id ? m.user2 : m.user1;
              const matchDate = m.listing?.dateTime ?? m.scheduledAt;
              const needsAction = !m.iHaveConfirmed && m.status !== "COMPLETED" && m.status !== "CANCELLED" && matchDate && new Date(matchDate) < new Date();
              const needsRating = m.status === "COMPLETED" && !m.iHaveRated;
              return (
                <Link key={m.id} href={`/eslesmeler/${m.id}`} className="block">
                  <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 hover:shadow-md transition ${needsAction || needsRating ? "border-amber-200 dark:border-amber-700" : "border-gray-100 dark:border-gray-700"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar user={opponent} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{opponent.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{m.listing?.sport.icon} {m.listing?.sport.name}</span>
                          </div>
                          {matchDate && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              📅 {format(new Date(matchDate), "d MMM yyyy, HH:mm", { locale: tr })}
                            </p>
                          )}
                          {m.listing?.district && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              📍 {m.listing.district.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={m.status} />
                        {needsAction && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">⚡ Onay gerekli</span>}
                        {needsRating && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">⭐ Puan ver</span>}
                      </div>
                    </div>
                    {m._count.messages > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">💬 {m._count.messages} mesaj</p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* ─── İlanlarım ───────────────────────────────────────────────────── */}
      {activeTab === "listings" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link href="/ilan/olustur" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              + Yeni İlan
            </Link>
          </div>
          {listings.length === 0 ? (
            <EmptyState icon="📋" text="Henüz ilan açmadın." />
          ) : (
            listings.map((l) => (
              <Link key={l.id} href={`/ilan/${l.id}`} className="block">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                          {l.sport.icon} {l.sport.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{TYPE_LABELS[l.type] ?? l.type}</span>
                      </div>
                      {l.district && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">📍 {l.district.name}, {l.district.city.name}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        📅 {format(new Date(l.dateTime), "d MMM yyyy, HH:mm", { locale: tr })}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        📩 {l._count.responses} başvuru
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ─── Başvurularım ─────────────────────────────────────────────────── */}
      {activeTab === "responses" && (
        <div className="space-y-3">
          {responses.length === 0 ? (
            <EmptyState icon="📩" text="Henüz bir ilana başvurmadın." />
          ) : (
            responses.map((r) => (
              <Link key={r.id} href={`/ilan/${r.listing.id}`} className="block">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={r.listing.user} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                            {r.listing.sport.icon} {r.listing.sport.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{r.listing.user.name}</span>
                        </div>
                        {r.listing.district && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">📍 {r.listing.district.name}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          📅 {format(new Date(r.listing.dateTime), "d MMM yyyy, HH:mm", { locale: tr })}
                        </p>
                        {r.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic truncate">&ldquo;{r.message}&rdquo;</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={r.status} />
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {formatDistanceToNow(new Date(r.createdAt), { locale: tr, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ─── Teklifler ─────────────────────────────────────────────────────── */}
      {activeTab === "challenges" && (
        <div className="space-y-4">
          {/* Gelen teklifler */}
          {challenges.received.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                📥 Gelen Teklifler ({challenges.received.length})
              </h2>
              <div className="space-y-3">
                {challenges.received.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} direction="received" onAction={handleChallengeAction} />
                ))}
              </div>
            </div>
          )}

          {/* Gönderilen teklifler */}
          {challenges.sent.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                📤 Gönderilen Teklifler ({challenges.sent.length})
              </h2>
              <div className="space-y-3">
                {challenges.sent.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} direction="sent" onAction={handleChallengeAction} />
                ))}
              </div>
            </div>
          )}

          {challenges.received.length === 0 && challenges.sent.length === 0 && (
            <EmptyState icon="⚔️" text="Bekleyen teklif yok." />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Alt Bileşenler ────────────────────────────────────────────────────────────
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <span className="text-4xl">{icon}</span>
      <p className="text-gray-400 dark:text-gray-500 text-sm">{text}</p>
    </div>
  );
}

function ChallengeCard({
  challenge, direction, onAction,
}: {
  challenge: Challenge;
  direction: "received" | "sent";
  onAction: (id: string, action: "ACCEPTED" | "REJECTED") => void;
}) {
  const [loading, setLoading] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const other = direction === "received" ? challenge.challenger : challenge.target;
  const expiresAt = new Date(challenge.expiresAt);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 6 * 60 * 60 * 1000;

  const handleAction = async (action: "ACCEPTED" | "REJECTED") => {
    setLoading(action);
    await onAction(challenge.id, action);
    setLoading(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar user={other} />
          <div className="min-w-0">
            <Link href={`/profil/${other.id}`} className="font-semibold text-sm text-gray-800 dark:text-gray-100 hover:underline">
              {other.name}
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {challenge.sport.icon} {challenge.sport.name}
              {challenge.district && ` · ${challenge.district.name}`}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
          challenge.challengeType === "RIVAL"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        }`}>
          {challenge.challengeType === "RIVAL" ? "⚔️ Rakip" : "🤝 Partner"}
        </span>
      </div>

      {challenge.message && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-1.5">
          &ldquo;{challenge.message}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs ${isExpiringSoon ? "text-red-500 font-semibold" : "text-gray-400 dark:text-gray-500"}`}>
          ⏳ {formatDistanceToNow(expiresAt, { locale: tr, addSuffix: true })} sona eriyor
        </span>
        {challenge.proposedDateTime && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            📅 {format(new Date(challenge.proposedDateTime), "d MMM HH:mm", { locale: tr })}
          </span>
        )}
      </div>

      {direction === "received" && (
        <div className="flex gap-2">
          <button
            disabled={loading !== null}
            onClick={() => handleAction("ACCEPTED")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition"
          >
            {loading === "ACCEPTED"
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : "✅ Kabul Et"}
          </button>
          <button
            disabled={loading !== null}
            onClick={() => handleAction("REJECTED")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-red-50 disabled:opacity-50 text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/20 dark:text-red-400 text-sm font-semibold py-2 rounded-xl transition"
          >
            {loading === "REJECTED"
              ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              : "❌ Reddet"}
          </button>
        </div>
      )}
    </div>
  );
}
