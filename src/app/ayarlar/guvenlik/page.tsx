"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { updateProfile } from "@/services/api";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function GuvenlikPage() {
  const router = useRouter();
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Hesap silme
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) { toast.error("Mevcut şifrenizi giriniz"); return; }
    if (passwordForm.newPassword.length < 8) { toast.error("Yeni şifre en az 8 karakter olmalı"); return; }
    if (!/[A-Z]/.test(passwordForm.newPassword)) { toast.error("Yeni şifre büyük harf içermeli"); return; }
    if (!/[0-9]/.test(passwordForm.newPassword)) { toast.error("Yeni şifre rakam içermeli"); return; }
    if (!/[^A-Za-z0-9]/.test(passwordForm.newPassword)) { toast.error("Yeni şifre özel karakter içermeli"); return; }
    if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) { toast.error("Şifreler eşleşmiyor"); return; }

    setSavingPassword(true);
    try {
      const res = await updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (res.success) {
        toast.success("Şifre başarıyla değiştirildi ✓");
        setPasswordForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      } else {
        toast.error((res as any).error || "Şifre değiştirilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSavingPassword(false);
    }
  };

  // Şifre kuralları göstergesi
  const rules = [
    { test: passwordForm.newPassword.length >= 8, label: "En az 8 karakter" },
    { test: /[A-Z]/.test(passwordForm.newPassword), label: "Büyük harf" },
    { test: /[a-z]/.test(passwordForm.newPassword), label: "Küçük harf" },
    { test: /[0-9]/.test(passwordForm.newPassword), label: "Rakam" },
    { test: /[^A-Za-z0-9]/.test(passwordForm.newPassword), label: "Özel karakter" },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Şifre Değiştir ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Şifre Değiştir</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Güçlü bir şifre hesabını korur.
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className={labelClass}>Mevcut Şifre</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className={inputClass}
                placeholder="Mevcut şifreniz"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm hover:text-gray-600"
              >
                {showCurrent ? "Gizle" : "Göster"}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Yeni Şifre</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className={inputClass}
                placeholder="Yeni şifreniz"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm hover:text-gray-600"
              >
                {showNew ? "Gizle" : "Göster"}
              </button>
            </div>
            {passwordForm.newPassword && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {rules.map((r) => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span className={`text-xs ${r.test ? "text-emerald-500" : "text-gray-400"}`}>{r.test ? "✓" : "○"}</span>
                    <span className={`text-xs ${r.test ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Yeni Şifre Tekrar</label>
            <input
              type="password"
              value={passwordForm.newPasswordConfirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPasswordConfirm: e.target.value })}
              className={inputClass}
              placeholder="Yeni şifrenizi tekrar giriniz"
              autoComplete="new-password"
            />
            {passwordForm.newPasswordConfirm && passwordForm.newPassword !== passwordForm.newPasswordConfirm && (
              <p className="text-xs text-red-500 mt-1">Şifreler eşleşmiyor</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={savingPassword} className="min-w-[160px]">
              Şifremi Değiştir
            </Button>
          </div>
        </form>
      </div>

      {/* ─── Hesap Silme ──────────────────────────────── */}
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-1">Tehlikeli Bölge</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
          Hesabını kalıcı olarak silmek istersen aşağıdaki butonu kullan.
          Bu işlem geri alınamaz; tüm verileriniz silinecektir.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
          >
            Hesabımı Sil
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Onaylamak için şifrenizi giriniz:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={inputClass}
              placeholder="Mevcut şifreniz"
              autoComplete="current-password"
            />
            <div className="flex gap-3">
              <button
                disabled={deleting || !deletePassword}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const res = await fetch("/api/profile", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password: deletePassword }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast.success("Hesabınız silindi. Hoşça kalın.");
                      await signOut({ redirect: false });
                      router.push("/auth/login");
                    } else {
                      toast.error(data.error || "Hesap silinemedi");
                    }
                  } catch {
                    toast.error("Bir hata oluştu");
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Evet, Hesabımı Sil"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
