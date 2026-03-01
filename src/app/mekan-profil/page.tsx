"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type VenueProfileData = {
  businessName: string;
  address: string;
  description: string;
  phone: string;
  website: string;
  capacity: string;
  fieldCount: string;
  openingHours: string;
  sports: string[];
};

const SPORT_OPTIONS = [
  "Futbol", "Basketbol", "Tenis", "Voleybol", "Yüzme",
  "Fitness", "Boks", "Badminton", "Padel", "Squash",
  "Masa Tenisi", "Yoga", "Pilates", "Koşu",
];

export default function MekanProfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ approvedMatches: number } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [form, setForm] = useState<VenueProfileData>({
    businessName: "", address: "", description: "", phone: "",
    website: "", capacity: "", fieldCount: "", openingHours: "", sports: [],
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/giris");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/venue-profile")
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          const p = d.profile;
          setForm({
            businessName: p.businessName || "",
            address: p.address || "",
            description: p.description || "",
            phone: p.phone || "",
            website: p.website || "",
            capacity: p.capacity?.toString() || "",
            fieldCount: p.fieldCount?.toString() || "",
            openingHours: p.openingHours || "",
            sports: p.sports || [],
          });
          setIsVerified(p.isVerified);
          setProfileId(p.id);
        }
        if (d.stats) setStats(d.stats);
      })
      .catch(() => toast.error("Profil yüklenemedi"))
      .finally(() => setLoading(false));
  }, [status]);

  const toggleSport = (sport: string) => {
    setForm(f => ({
      ...f,
      sports: f.sports.includes(sport)
        ? f.sports.filter(s => s !== sport)
        : [...f.sports, sport],
    }));
  };

  const handleSave = async () => {
    if (!form.businessName.trim()) {
      toast.error("İşletme adı zorunlu");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/venue-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.profile) toast.success("Mekan profili güncellendi!");
      else toast.error(json.error || "Kaydedilemedi");
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🏟️ Mekan Profili</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {form.businessName || session?.user?.name} · Kurumsal Hesap
            </p>
          </div>
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-bold px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-700">
              ✓ Onaylı Mekan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-medium px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-700">
              ⏳ Onay Bekliyor
            </span>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800 text-center">
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{stats.approvedMatches}</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">Onaylanan Maç</p>
              <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-0.5">Mekanınızda onayladığınız maçlar</p>
            </div>
          </div>
        )}

        {/* Durum Bilgisi */}
        {isVerified ? (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">✅ Mekanınız Aktif</p>
            <ul className="space-y-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <li>🔍 Mekanınız harita aramasında görünür</li>
              <li>🏅 Maçlarda &quot;Kesin Kanıt&quot; onayı verebilirsiniz</li>
              <li>📋 Kullanıcılar maç yerini mekanınız olarak seçebilir</li>
              <li>⭐ Mekanınız öne çıkan mekanlar listesine girebilir</li>
            </ul>
            {profileId && (
              <Link
                href={`/mekanlar/${profileId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                🔗 Herkese açık profilimi görüntüle →
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">⏳ Onay Sürecindedir</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
              Mekan profiliniz admin tarafından inceleniyor. Onaylandıktan sonra:
            </p>
            <ul className="space-y-1.5 text-xs text-amber-600 dark:text-amber-400">
              <li>🔍 Harita aramalarında görünür olacaksınız</li>
              <li>🏅 Maçlara &quot;Kesin Kanıt&quot; onayı verebileceksiniz</li>
              <li>📋 Kullanıcılar sizi maç yeri olarak seçebilecek</li>
            </ul>
            <p className="text-xs text-amber-500 dark:text-amber-500 mt-2">
              💡 İpucu: Profil bilgilerinizi eksiksiz doldurmak onay sürecini hızlandırır.
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-3">Mekan Bilgileri</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            İşletme Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text" value={form.businessName}
            onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
            placeholder="Örn: Olimpik Spor Merkezi"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açık Adres</label>
          <input
            type="text" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="İlçe, Mahalle, Cadde No"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          {form.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(form.address)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              🗺️ Google Harita'da Gör
            </a>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
          <textarea
            value={form.description} rows={3}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Tesisleriniz, sunduğunuz hizmetler..."
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📞 Telefon</label>
            <input
              type="text" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0212 555 00 00"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🌐 Web Sitesi</label>
            <input
              type="url" value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👥 Kapasite</label>
            <input
              type="number" value={form.capacity} min={0}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              placeholder="Kişi sayısı"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">⚽ Saha Sayısı</label>
            <input
              type="number" value={form.fieldCount} min={0}
              onChange={e => setForm(f => ({ ...f, fieldCount: e.target.value }))}
              placeholder="Saha/alan adedi"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">⏰ Çalışma Saatleri</label>
          <input
            type="text" value={form.openingHours}
            onChange={e => setForm(f => ({ ...f, openingHours: e.target.value }))}
            placeholder="Örn: 08:00-23:00"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Desteklenen Sporlar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🏆 Desteklenen Sporlar</label>
          <div className="flex flex-wrap gap-2">
            {SPORT_OPTIONS.map(sport => (
              <button
                key={sport} type="button"
                onClick={() => toggleSport(sport)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                  form.sports.includes(sport)
                    ? "bg-emerald-500 text-white border-emerald-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-emerald-400"
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
        >
          {saving ? "Kaydediliyor..." : "Profili Kaydet"}
        </button>
      </div>

      {/* Onay Bilgilendirmesi */}
      {!isVerified && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">🔍 Onay Süreci</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5 list-disc list-inside">
            <li>Profil bilgilerinizi eksiksiz doldurun</li>
            <li>Admin ekibi 24-48 saat içinde inceleyecek</li>
            <li>Onaylandıktan sonra mekan profil sayfanız yayına girecek</li>
            <li>Onaylı mekanlar maçlara "Kesin Kanıt" onayı verebilir</li>
          </ul>
        </div>
      )}
    </div>
  );
}
