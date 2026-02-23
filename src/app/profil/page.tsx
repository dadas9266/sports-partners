"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/useProfile";
import { deleteListing, updateProfile } from "@/services/api";
import type { ListingWithResponses, ResponseWithListing, Match, ProfileEditForm } from "@/types";
import { STATUS_LABELS } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function ProfilePage() {
  const { data, loading, error, status, session, refresh, setData } = useProfile();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"listings" | "responses" | "matches">("listings");
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Profile edit states
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditForm>({
    name: "", phone: "", currentPassword: "", newPassword: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/giris");
    }
  }, [status, router]);

  if (status === "unauthenticated") return null;

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16" role="alert">
        <p className="text-red-500">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!session || !data) return null;

  const pendingResponsesCount = data.myListings?.reduce(
    (acc: number, l: ListingWithResponses) =>
      acc + (l.responses?.filter((r) => r.status === "PENDING")?.length || 0),
    0
  );

  const handleDeleteListing = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteListing(deleteModal);
      toast.success("İlan silindi");
      setData((prev) => prev ? {
        ...prev,
        myListings: prev.myListings.filter((l) => l.id !== deleteModal),
      } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      name: data.user.name,
      phone: data.user.phone || "",
      currentPassword: "",
      newPassword: "",
    });
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    // Client-side validation
    if (!editForm.name.trim()) {
      toast.error("Ad Soyad boş olamaz");
      return;
    }
    if (editForm.name.trim().length < 2) {
      toast.error("Ad Soyad en az 2 karakter olmalıdır");
      return;
    }
    if (editForm.phone && !/^[0-9+\-\s()]{7,15}$/.test(editForm.phone)) {
      toast.error("Geçerli bir telefon numarası girin");
      return;
    }
    if (editForm.newPassword) {
      if (!editForm.currentPassword) {
        toast.error("Mevcut şifrenizi girin");
        return;
      }
      const pwErrors = [
        editForm.newPassword.length < 8 && "en az 8 karakter",
        !/[A-Z]/.test(editForm.newPassword) && "büyük harf",
        !/[a-z]/.test(editForm.newPassword) && "küçük harf",
        !/[0-9]/.test(editForm.newPassword) && "rakam",
        !/[^A-Za-z0-9]/.test(editForm.newPassword) && "özel karakter",
      ].filter(Boolean);
      if (pwErrors.length > 0) {
        toast.error(`Yeni şifre gereksinimleri: ${pwErrors.join(", ")}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (editForm.name !== data.user.name) payload.name = editForm.name;
      if (editForm.phone !== (data.user.phone || "")) payload.phone = editForm.phone || null;
      if (editForm.newPassword) {
        payload.currentPassword = editForm.currentPassword;
        payload.newPassword = editForm.newPassword;
      }
      if (Object.keys(payload).length === 0) {
        setEditMode(false);
        return;
      }
      await updateProfile(payload);
      toast.success("Profil güncellendi");
      setEditMode(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profil başlığı */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        {!editMode ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-2xl">
                {data.user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.user?.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">{data.user?.email}</p>
                {data.user?.phone && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">📞 {data.user.phone}</p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={handleEditProfile}>
                Düzenle
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Profili Düzenle</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="05551234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mevcut Şifre (değiştirmek için)</label>
              <input
                type="password"
                value={editForm.currentPassword}
                onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Şifre</label>
              <input
                type="password"
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Min 8 karakter, büyük/küçük harf, rakam, özel karakter"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} loading={saving}>Kaydet</Button>
              <Button variant="secondary" onClick={() => setEditMode(false)}>Vazgeç</Button>
            </div>
          </div>
        )}
        <div className="flex gap-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center flex-1">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.myListings?.length || 0}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">İlanlarım</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center flex-1">
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{pendingResponsesCount}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Bekleyen Karşılık</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center flex-1">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{data.myMatches?.length || 0}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Eşleşmeler</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist">
        {[
          { key: "listings", label: "İlanlarım" },
          { key: "responses", label: "Gönderdiğim Karşılıklar" },
          { key: "matches", label: "Eşleşmeler" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === tab.key
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* İlanlarım */}
      {activeTab === "listings" && (
        <div className="space-y-4" role="tabpanel">
          {data.myListings?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg">Henüz ilan oluşturmadınız</p>
              <Link
                href="/ilan/olustur"
                className="inline-block mt-3 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                İlan Oluştur
              </Link>
            </div>
          ) : (
            data.myListings?.map((listing: ListingWithResponses) => (
              <div key={listing.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/ilan/${listing.id}`}
                      className="text-lg font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      {listing.sport?.icon} {listing.sport?.name}
                    </Link>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={listing.type === "RIVAL" ? "orange" : "emerald"}>
                        {listing.type === "RIVAL" ? "Rakip" : "Partner"}
                      </Badge>
                      <Badge variant={
                        listing.status === "OPEN" ? "blue" :
                        listing.status === "MATCHED" ? "green" : "gray"
                      }>
                        {STATUS_LABELS[listing.status]?.label}
                      </Badge>
                    </div>
                  </div>
                  {listing.status === "OPEN" && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteModal(listing.id)}>
                      🗑️ Sil
                    </Button>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  📍 {listing.district?.city?.name}, {listing.district?.name} ·{" "}
                  📅 {format(new Date(listing.dateTime), "d MMM yyyy HH:mm", { locale: tr })}
                </div>

                {listing.responses?.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Gelen Karşılıklar ({listing.responses.length})
                    </p>
                    {listing.responses.map((resp) => (
                      <div key={resp.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{resp.user?.name}</span>
                          {resp.message && (
                            <span className="text-sm text-gray-400 ml-2">- {resp.message.slice(0, 50)}</span>
                          )}
                        </div>
                        <Badge variant={
                          resp.status === "PENDING" ? "yellow" :
                          resp.status === "ACCEPTED" ? "green" : "red"
                        }>
                          {STATUS_LABELS[resp.status]?.label}
                        </Badge>
                      </div>
                    ))}
                    {listing.status === "OPEN" && (
                      <Link
                        href={`/ilan/${listing.id}`}
                        className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-2 inline-block"
                      >
                        Detay & Kabul/Red →
                      </Link>
                    )}
                  </div>
                )}

                {listing.match && (
                  <div className="mt-3 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ Eşleşme: {listing.match.user2?.name}
                      {listing.match.user2?.phone && (
                        <span> · 📞 {listing.match.user2.phone}</span>
                      )}
                      {listing.match.user2?.email && (
                        <span> · ✉️ {listing.match.user2.email}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Gönderdiğim Karşılıklar */}
      {activeTab === "responses" && (
        <div className="space-y-4" role="tabpanel">
          {data.myResponses?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg">Henüz karşılık göndermediniz</p>
            </div>
          ) : (
            data.myResponses?.map((resp: ResponseWithListing) => (
              <div key={resp.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/ilan/${resp.listingId}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {resp.listing?.sport?.icon} {resp.listing?.sport?.name}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">({resp.listing?.user?.name})</span>
                  </Link>
                  <Badge variant={
                    resp.status === "PENDING" ? "yellow" :
                    resp.status === "ACCEPTED" ? "green" : "red"
                  }>
                    {STATUS_LABELS[resp.status]?.label}
                  </Badge>
                </div>
                {resp.message && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{resp.message}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Eşleşmeler */}
      {activeTab === "matches" && (
        <div className="space-y-4" role="tabpanel">
          {data.myMatches?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg">Henüz eşleşmeniz yok</p>
            </div>
          ) : (
            data.myMatches?.map((match: Match) => {
              const partner = match.user1Id === session?.user?.id
                ? match.user2
                : match.user1;
              return (
                <div key={match.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/ilan/${match.listingId}`}
                        className="font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        {match.listing?.sport?.icon} {match.listing?.sport?.name}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Partner: {partner?.name}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      {partner?.phone && <p>📞 {partner.phone}</p>}
                      <p>✉️ {partner?.email}</p>
                    </div>
                  </div>
                  {match.listing?.venue && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      🏟️ {match.listing.venue.name}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDeleteListing}
        title="İlanı Sil"
        description="Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="İlanı Sil"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
