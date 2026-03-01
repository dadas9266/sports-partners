"use client";

import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { ProfileEditForm } from "@/types";

interface Sport {
  id: string;
  icon: string;
  name: string;
}

interface District {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  districts?: District[];
}

interface Country {
  id: string;
  code: string;
  name: string;
  cities?: City[];
}

interface ProfileEditFormProps {
  editForm: ProfileEditForm;
  setEditForm: (form: ProfileEditForm) => void;
  sports: Sport[];
  locations: Country[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function ProfileEditFormPanel({
  editForm,
  setEditForm,
  sports,
  locations,
  saving,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const inputCls =
    "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none";

  const selectedCountry = locations.find((l) =>
    l.cities?.some((c) => c.id === editForm.cityId)
  );
  const citiesForCountry = selectedCountry?.cities ?? [];
  const districtsForCity =
    locations
      .flatMap((l) => l.cities ?? [])
      .find((c) => c.id === editForm.cityId)?.districts ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Profili Düzenle
      </h2>

      {/* Ad Soyad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ad Soyad
        </label>
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Hakkımda
        </label>
        <textarea
          value={editForm.bio}
          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
          maxLength={300}
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Kendinizden bahsedin..."
        />
        <p className="text-xs text-gray-400 mt-1">{editForm.bio?.length ?? 0}/300</p>
      </div>

      {/* Konum */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Konum
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Ülke */}
          <select
            value={selectedCountry?.id ?? ""}
            onChange={(e) => {
              const country = locations.find((l) => l.id === e.target.value);
              setEditForm({
                ...editForm,
                cityId: country?.cities?.[0]?.id ?? "",
                districtId: "",
              });
            }}
            className={inputCls}
          >
            <option value="">Ülke Seçin...</option>
            {[...locations]
              .sort((a, b) =>
                a.code === "TR" ? -1 : b.code === "TR" ? 1 : a.name.localeCompare(b.name)
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* Şehir */}
          <select
            value={editForm.cityId}
            onChange={(e) =>
              setEditForm({ ...editForm, cityId: e.target.value, districtId: "" })
            }
            className={inputCls}
          >
            <option value="">Şehir Seçin...</option>
            {[...citiesForCountry]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* İlçe */}
          <select
            value={editForm.districtId}
            onChange={(e) =>
              setEditForm({ ...editForm, districtId: e.target.value })
            }
            className={inputCls}
            disabled={!editForm.cityId}
          >
            <option value="">İlçe Seçin...</option>
            {[...districtsForCity]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Cinsiyet + Doğum Tarihi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cinsiyet
          </label>
          <select
            value={editForm.gender}
            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
            className={inputCls}
          >
            <option value="">Belirtilmemiş</option>
            <option value="MALE">Erkek</option>
            <option value="FEMALE">Kadın</option>
            <option value="PREFER_NOT_TO_SAY">Belirtmek İstemiyorum</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Doğum Tarihi
          </label>
          <input
            type="date"
            value={editForm.birthDate}
            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Sporlar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sporlarım (max 5)
        </label>
        <div className="flex flex-wrap gap-2">
          {sports.map((s) => {
            const selected = editForm.sportIds?.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const cur = editForm.sportIds ?? [];
                  if (selected) {
                    setEditForm({ ...editForm, sportIds: cur.filter((id) => id !== s.id) });
                  } else if (cur.length < 5) {
                    setEditForm({ ...editForm, sportIds: [...cur, s.id] });
                  } else {
                    toast.error("En fazla 5 spor seçebilirsiniz");
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                  selected
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                }`}
              >
                {s.icon} {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Telefon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Telefon
        </label>
        <input
          type="tel"
          value={editForm.phone}
          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          className={inputCls}
          placeholder="05551234567"
        />
      </div>

      {/* Şifre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Mevcut Şifre (değiştirmek için)
        </label>
        <input
          type="password"
          value={editForm.currentPassword}
          onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Yeni Şifre
        </label>
        <input
          type="password"
          value={editForm.newPassword}
          onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
          className={inputCls}
          placeholder="Min 8 karakter, büyük/küçük harf, rakam, özel karakter"
        />
      </div>

      {/* Sosyal Medya */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Sosyal Medya Hesapları
        </label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { key: "instagram", label: "IG", bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", placeholder: "Instagram kullanıcı adı" },
            { key: "tiktok",    label: "TT", bg: "bg-black",    placeholder: "TikTok kullanıcı adı" },
            { key: "facebook",  label: "FB", bg: "bg-blue-600", placeholder: "Facebook profil adı veya URL" },
            { key: "twitterX",  label: "X",  bg: "bg-black",    placeholder: "X (Twitter) kullanıcı adı" },
            { key: "vk",        label: "VK", bg: "bg-blue-500", placeholder: "VK kullanıcı adı veya URL" },
          ].map(({ key, label, bg, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full ${bg} text-white text-xs font-bold`}
              >
                {label}
              </span>
              <input
                type="text"
                value={(editForm as any)[key] ?? ""}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Butonlar */}
      <div className="flex gap-2">
        <Button onClick={onSave} loading={saving}>
          Kaydet
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
