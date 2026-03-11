"use client";

import { useState, useEffect, useCallback } from "react";

type PrivacyLevel = "EVERYONE" | "FOLLOWERS" | "NOBODY";

interface PrivacySettings {
  whoCanMessage: PrivacyLevel;
  whoCanChallenge: PrivacyLevel;
  profileVisibility: PrivacyLevel;
  showOnLeaderboard: boolean;
  isPrivateProfile: boolean;
  socialLinksVisibility: PrivacyLevel;
}

interface BlockedUser {
  id: string;
  type: "BLOCK" | "RESTRICT";
  createdAt: string;
  blocked: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

const LEVELS: { value: PrivacyLevel; label: string; icon: string; desc: string }[] = [
  { value: "EVERYONE", label: "Herkes", icon: "🌍", desc: "Tüm kullanıcılar" },
  { value: "FOLLOWERS", label: "Takipçiler", icon: "👥", desc: "Yalnızca takip edenler" },
  { value: "NOBODY", label: "Kimse", icon: "🚫", desc: "Kapalı" },
];

function PrivacySelector({
  label,
  description,
  icon,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  icon: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => !disabled && onChange(level.value)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-center transition-all ${
              value === level.value
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className="text-base">{level.icon}</span>
            <span className="text-xs font-semibold">{level.label}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{level.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

interface FollowRequest {
  followId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    city: { name: string } | null;
  };
}

export default function GizlilikPage() {
  const [settings, setSettings] = useState<PrivacySettings>({
    whoCanMessage: "EVERYONE",
    whoCanChallenge: "EVERYONE",
    profileVisibility: "EVERYONE",
    showOnLeaderboard: true,
    isPrivateProfile: false,
    socialLinksVisibility: "EVERYONE",
  });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [processingFollowId, setProcessingFollowId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [privRes, blockRes, followReqRes] = await Promise.all([
        fetch("/api/settings/privacy"),
        fetch("/api/settings/blocked-users"),
        fetch("/api/follow-requests"),
      ]);
      if (privRes.ok) {
        const { data } = await privRes.json();
        setSettings(data);
      }
      if (blockRes.ok) {
        const { data } = await blockRes.json();
        setBlockedUsers(data);
      }
      if (followReqRes.ok) {
        const { data } = await followReqRes.json();
        setFollowRequests(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    setUnblockingId(blockedId);
    try {
      const res = await fetch(`/api/users/${blockedId}/block`, { method: "DELETE" });
      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((b) => b.blocked.id !== blockedId));
      }
    } finally {
      setUnblockingId(null);
    }
  };

  const handleFollowRequest = async (followId: string, action: "ACCEPT" | "REJECT") => {
    setProcessingFollowId(followId);
    try {
      const res = await fetch("/api/follow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followId, action }),
      });
      if (res.ok) {
        setFollowRequests((prev) => prev.filter((r) => r.followId !== followId));
      }
    } finally {
      setProcessingFollowId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/3" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-gray-700/50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🛡️</span>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gizlilik & Güvenlik</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-10">
          Sana kim mesaj yazabilir, kim teklif gönderebilir ve profilini kimler görebilir — hepsini kontrol et.
        </p>
      </div>

      {/* Gizlilik Ayarları */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Erişim Kontrolleri
        </h3>

        <PrivacySelector
          label="Bana Kim Mesaj Yazabilir?"
          description="Yeni direkt mesaj konuşması başlatabilecek kişileri belirle"
          icon="💬"
          value={settings.whoCanMessage}
          onChange={(v) => setSettings((s) => ({ ...s, whoCanMessage: v }))}
          disabled={saving}
        />

        <PrivacySelector
          label="Bana Kim Teklif Gönderebilir?"
          description="Maç veya partner teklifi gönderebilecek kişileri belirle"
          icon="⚔️"
          value={settings.whoCanChallenge}
          onChange={(v) => setSettings((s) => ({ ...s, whoCanChallenge: v }))}
          disabled={saving}
        />

        <PrivacySelector
          label="Profilimi Kimler Görebilir?"
          description="Profil sayfana kimlerin erişebileceğini belirle"
          icon="👁️"
          value={settings.profileVisibility}
          onChange={(v) => setSettings((s) => ({ ...s, profileVisibility: v }))}
          disabled={saving}
        />

        <PrivacySelector
          label="Sosyal Medya Linklerimi Kimler Görebilir?"
          description="Telegram, WhatsApp ve diğer sosyal medya bağlantılarını kimlerin göreceğini belirle"
          icon="🔗"
          value={settings.socialLinksVisibility}
          onChange={(v) => setSettings((s) => ({ ...s, socialLinksVisibility: v }))}
          disabled={saving}
        />

        {/* Kapalı Profil */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Kapalı Profil</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Açıksa, seni takip etmek isteyenler onay bekler. Sadece onayladıkların takipçin olur.
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.isPrivateProfile}
            onChange={(v) => setSettings((s) => ({ ...s, isPrivateProfile: v }))}
            disabled={saving}
          />
        </div>

        {/* Liderlik Tablosu */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">🏆</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Liderlik Tablosunda Görün</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Puan tablosuna adını ve istatistiklerini dahil et
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.showOnLeaderboard}
            onChange={(v) => setSettings((s) => ({ ...s, showOnLeaderboard: v }))}
            disabled={saving}
          />
        </div>

        {/* Kaydet */}
        <div className="flex items-center justify-between pt-2">
          {saveStatus === "success" && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Kayıt edildi
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-500">Kayıt hatası, tekrar deneyin</span>
          )}
          {saveStatus === "idle" && <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-2 rounded-xl transition disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Kaydediliyor…
              </>
            ) : (
              "Kaydet"
            )}
          </button>
        </div>
      </div>

      {/* Bilgi paneli */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
        <span className="text-blue-500 mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Gizlilik ayarları hakkında</p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
            <li><strong>Kapalı Profil</strong>: Takip istekleri onayınızı bekler, onaylamayanlar seni takip edemez.</li>
            <li><strong>Takipçiler</strong> seçeneği: Yalnızca seni takip eden kullanıcılara izin verir.</li>
            <li><strong>Kimse</strong> seçeneği: Yeni konuşma veya teklif başlatılmasını tamamen kapatır.</li>
            <li>Mevcut maç konuşmaları bu ayardan etkilenmez.</li>
          </ul>
        </div>
      </div>

      {/* Takip İstekleri */}
      {settings.isPrivateProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Takip İstekleri
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Kapalı profilini takip etmek isteyenler</p>
            </div>
            {followRequests.length > 0 && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-semibold">
                {followRequests.length} istek
              </span>
            )}
          </div>
          {followRequests.length === 0 ? (
            <div className="py-8 text-center bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <span className="text-3xl">🔔</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Bekleyen takip isteği yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {followRequests.map((req) => (
                <div key={req.followId} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base font-bold text-emerald-600 shrink-0 overflow-hidden">
                      {req.user.avatarUrl ? <img src={req.user.avatarUrl} alt={req.user.name} className="w-full h-full object-cover" /> : req.user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{req.user.name}</p>
                      {req.user.city && <p className="text-xs text-gray-400 truncate">📍 {req.user.city.name}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleFollowRequest(req.followId, "ACCEPT")}
                      disabled={processingFollowId === req.followId}
                      className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {processingFollowId === req.followId ? "…" : "Kabul Et"}
                    </button>
                    <button
                      onClick={() => handleFollowRequest(req.followId, "REJECT")}
                      disabled={processingFollowId === req.followId}
                      className="text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-500 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {processingFollowId === req.followId ? "…" : "Reddet"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engellenen Kullanıcılar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Engellenen Kullanıcılar
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Engellediğin kişiler sana mesaj yazamaz ve içeriklerini göremezsin
            </p>
          </div>
          {blockedUsers.length > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-semibold">
              {blockedUsers.length} kişi
            </span>
          )}
        </div>

        {blockedUsers.length === 0 ? (
          <div className="py-10 text-center bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <span className="text-4xl">🤝</span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Engellediğin kullanıcı yok.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={block.blocked.avatarUrl || "/icons/avatar.svg"}
                    alt={block.blocked.name}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{block.blocked.name}</p>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        block.type === "BLOCK"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {block.type === "BLOCK" ? "Engellendi" : "Kısıtlandı"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(block.blocked.id)}
                  disabled={unblockingId === block.blocked.id}
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {unblockingId === block.blocked.id ? "…" : "Engeli Kaldır"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

