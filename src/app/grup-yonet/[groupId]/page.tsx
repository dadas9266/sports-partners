"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

type MemberStatus = "PENDING" | "APPROVED";

interface Member {
  id: string; // membershipId
  role: string;
  status: MemberStatus;
  joinedAt: string;
  user: { id: string; name: string | null; avatarUrl: string | null; totalMatches: number };
}

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  avatarUrl: string | null;
  sport: { name: string } | null;
  city: { name: string } | null;
  _count: { members: number };
}

type Tab = "pending" | "members" | "settings";

export default function GroupManagePage() {
  const { data: session, status: authStatus } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = (params?.groupId ?? "") as string;

  const [tab, setTab] = useState<Tab>("pending");
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [pending, setPending] = useState<Member[]>([]);
  const [approved, setApproved] = useState<Member[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Settings form state
  const [form, setForm] = useState({ name: "", description: "", isPublic: true });
  const [saving, setSaving] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const json = await res.json();
      if (json.success) {
        setGroup(json.data);
        setForm({
          name: json.data.name ?? "",
          description: json.data.description ?? "",
          isPublic: json.data.isPublic ?? true,
        });
      } else {
        toast.error("Grup bulunamadı");
        router.push("/gruplar");
      }
    } catch {
      toast.error("Grup bilgisi yüklenemedi");
    }
  }, [groupId, router]);

  const fetchMembers = useCallback(async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/members?status=PENDING`),
        fetch(`/api/groups/${groupId}/members?status=APPROVED`),
      ]);
      const [pendingJson, approvedJson] = await Promise.all([pendingRes.json(), approvedRes.json()]);
      if (pendingJson.success) setPending(pendingJson.members ?? []);
      if (approvedJson.success) setApproved(approvedJson.members ?? []);
    } catch {
      toast.error("Üyeler yüklenemedi");
    }
  }, [groupId]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/giris");
      return;
    }
    if (authStatus === "authenticated") {
      const load = async () => {
        setLoadingData(true);
        await Promise.all([fetchGroup(), fetchMembers()]);
        setLoadingData(false);
      };
      load();
    }
  }, [authStatus, fetchGroup, fetchMembers, router]);

  // Check admin access after data loaded
  useEffect(() => {
    if (!loadingData && session && approved.length > 0) {
      const myAdmin = approved.find(
        (m) => m.user.id === session.user?.id && m.role === "ADMIN"
      );
      if (!myAdmin) {
        toast.error("Bu sayfaya erişim yetkiniz yok");
        router.push("/gruplar");
      }
    }
  }, [loadingData, session, approved, router]);

  const memberAction = async (membershipId: string, action: string) => {
    setActionId(membershipId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "İşlem başarısız");
      } else {
        toast.success(json.message ?? "Başarılı");
        await fetchMembers();
      }
    } catch {
      toast.error("Sunucu hatası");
    } finally {
      setActionId(null);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Kaydedilemedi");
      } else {
        toast.success("Grup bilgileri güncellendi");
        await fetchGroup();
      }
    } catch {
      toast.error("Sunucu hatası");
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === "loading" || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "pending", label: "Bekleyen Talepler", count: pending.length },
    { key: "members", label: "Üyeler", count: approved.length },
    { key: "settings", label: "Grup Ayarları" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/gruplar")}
            className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1"
          >
            ← Gruplar
          </button>
          <h1 className="text-2xl font-bold">
            {group?.name ?? "Grup Yönetimi"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {group?.sport?.name} · {group?.city?.name}
            {group && !group.isPublic && (
              <span className="ml-2 text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded-full">
                🔒 Özel
              </span>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    t.key === "pending"
                      ? "bg-yellow-500 text-gray-900"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Pending */}
        {tab === "pending" && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Bekleyen üyelik talebi yok
              </div>
            ) : (
              pending.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  actions={[
                    { label: "✓ Onayla", action: "approve", style: "green" },
                    { label: "✗ Reddet", action: "reject", style: "red" },
                  ]}
                  onAction={memberAction}
                  actionId={actionId}
                />
              ))
            )}
          </div>
        )}

        {/* Tab: Members */}
        {tab === "members" && (
          <div className="space-y-3">
            {approved.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Henüz üye yok
              </div>
            ) : (
              approved.map((m) => {
                const isSelf = m.user.id === session?.user?.id;
                const actions = isSelf
                  ? []
                  : m.role === "ADMIN"
                  ? [{ label: "↓ Üye Yap", action: "demote", style: "yellow" as const }]
                  : [
                      { label: "↑ Yönetici Yap", action: "promote", style: "blue" as const },
                      { label: "🚫 Çıkar", action: "remove", style: "red" as const },
                    ];
                return (
                  <MemberRow
                    key={m.id}
                    member={m}
                    actions={actions}
                    onAction={memberAction}
                    actionId={actionId}
                    adminLabel="👑 Yönetici"
                  />
                );
              })
            )}
          </div>
        )}

        {/* Tab: Settings */}
        {tab === "settings" && (
          <form onSubmit={saveSettings} className="space-y-4 bg-gray-900 p-6 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Grup Adı</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  form.isPublic ? "bg-green-600" : "bg-gray-700"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-300">
                {form.isPublic ? "Açık grup (herkes katılabilir)" : "Özel grup (katılım onay bekler)"}
              </span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
            >
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Member Row Component ────────────────────────────────────────────────────

type ActionStyle = "green" | "red" | "blue" | "yellow";

interface ActionDef {
  label: string;
  action: string;
  style: ActionStyle;
}

function MemberRow({
  member,
  actions,
  onAction,
  actionId,
  adminLabel = "👑 Kaptan",
}: {
  member: Member;
  actions: ActionDef[];
  onAction: (id: string, action: string) => void;
  actionId: string | null;
  adminLabel?: string;
}) {
  const styleMap: Record<ActionStyle, string> = {
    green: "bg-green-600 hover:bg-green-500 text-white",
    red: "bg-red-700 hover:bg-red-600 text-white",
    blue: "bg-blue-600 hover:bg-blue-500 text-white",
    yellow: "bg-yellow-600 hover:bg-yellow-500 text-gray-900",
  };

  const isActing = actionId === member.id;

  return (
    <div className="flex items-center gap-4 bg-gray-900 rounded-xl p-4">
      {member.user.avatarUrl ? (
        <img
          src={member.user.avatarUrl}
          alt={member.user.name ?? ""}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold flex-shrink-0">
          {(member.user.name ?? "?")[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{member.user.name ?? "Bilinmeyen"}</p>
        <p className="text-xs text-gray-400">
          {member.role === "ADMIN" ? adminLabel : "👤 Üye"} ·{" "}
          {member.user.totalMatches} maç
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {actions.map((a) => (
          <button
            key={a.action}
            disabled={isActing}
            onClick={() => onAction(member.id, a.action)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors ${styleMap[a.style]}`}
          >
            {isActing ? "..." : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
