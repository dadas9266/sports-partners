"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { registerUser } from "@/services/api";
import Button from "@/components/ui/Button";
import { useLocations } from "@/hooks/useLocations";

// ─── Adım göstergesi ────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              active
                ? "w-8 bg-emerald-500"
                : done
                ? "w-8 bg-emerald-300"
                : "w-8 bg-gray-200 dark:bg-gray-600"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function KayitPage() {
  const router = useRouter();
  const { status } = useSession();
  const { locations, loading: locLoading } = useLocations();

  const [step, setStep] = useState(1); // 1: Temel Bilgiler, 2: Konum/Profil
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state — sadece bireysel bilgiler
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    gender: "" as "" | "MALE" | "FEMALE" | "PREFER_NOT_TO_SAY",
    birthDate: "",
    countryId: "",
    cityId: "",
    districtId: "",
  });

  useEffect(() => {
    if (status === "authenticated") router.push("/");
  }, [status, router]);

  // ─── Konum yardımcıları ──────────────────────────────────────────────
  const countries = locations;
  const cities = countries.find((c) => c.id === form.countryId)?.cities || [];
  const selectedCity = cities.find((c) => c.id === form.cityId);
  const districts = selectedCity?.districts || [];

  // ─── Validasyon ──────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    if (form.name.trim().length < 2) { toast.error("İsim en az 2 karakter olmalı"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Geçerli bir e-posta giriniz"); return false; }
    if (form.password.length < 8) { toast.error("Şifre en az 8 karakter olmalı"); return false; }
    if (!/[A-Z]/.test(form.password)) { toast.error("Şifre en az bir büyük harf içermeli"); return false; }
    if (!/[a-z]/.test(form.password)) { toast.error("Şifre en az bir küçük harf içermeli"); return false; }
    if (!/[0-9]/.test(form.password)) { toast.error("Şifre en az bir rakam içermeli"); return false; }
    if (!/[^A-Za-z0-9]/.test(form.password)) { toast.error("Şifre en az bir özel karakter içermeli (!@#$%^&*)"); return false; }
    if (form.password !== form.passwordConfirm) { toast.error("Şifreler eşleşmiyor"); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!form.gender) { toast.error("Lütfen cinsiyet seçiniz"); return false; }
    if (!form.birthDate) { toast.error("Doğum tarihi gereklidir"); return false; }
    if (!form.countryId) { toast.error("Lütfen ülke seçiniz"); return false; }
    if (!form.cityId) { toast.error("Lütfen şehir seçiniz"); return false; }
    if (!form.districtId) { toast.error("Lütfen ilçe seçiniz"); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const res = await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
        countryId: form.countryId,
        cityId: form.cityId,
        districtId: form.districtId,
        // userType gönderilmiyor — backend INDIVIDUAL olarak kaydedecek
      });

      if (!res.success) {
        toast.error(res.error || "Kayıt başarısız");
        return;
      }

      toast.success("Kayıt başarılı! Giriş yapılıyor...");

      // Otomatik giriş yap
      const signInRes = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast.error("Giriş yapılamadı, lütfen manuel giriş yapınız");
        router.push("/auth/giris");
      } else {
        // Onboarding'e yönlendir
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      toast.error("Bir hata oluştu, tekrar deneyiniz");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition";
  const labelClass =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Başlık */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Hesap Oluştur
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {step === 1 ? "Temel bilgilerini gir" : "Konum ve profil bilgilerin"}
          </p>
        </div>

        <StepBar current={step} total={2} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ─── ADIM 1: Temel Bilgiler ──────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <label htmlFor="name" className={labelClass}>
                  Ad Soyad
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Adınız Soyadınız"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  E-posta
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="ornek@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Şifre
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputClass}
                    placeholder="En az 8 karakter"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? "Gizle" : "Göster"}
                  </button>
                </div>
                {/* Şifre gücü göstergesi */}
                {form.password && (
                  <div className="mt-2 space-y-1">
                    {[
                      { test: form.password.length >= 8, label: "En az 8 karakter" },
                      { test: /[A-Z]/.test(form.password), label: "Büyük harf" },
                      { test: /[a-z]/.test(form.password), label: "Küçük harf" },
                      { test: /[0-9]/.test(form.password), label: "Rakam" },
                      { test: /[^A-Za-z0-9]/.test(form.password), label: "Özel karakter" },
                    ].map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        <span className={`text-xs ${rule.test ? "text-emerald-500" : "text-gray-400"}`}>
                          {rule.test ? "✓" : "○"}
                        </span>
                        <span className={`text-xs ${rule.test ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="passwordConfirm" className={labelClass}>
                  Şifre Tekrar
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  required
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  className={inputClass}
                  placeholder="Şifrenizi tekrar giriniz"
                  autoComplete="new-password"
                />
                {form.passwordConfirm && form.password !== form.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">Şifreler eşleşmiyor</p>
                )}
              </div>

              <Button
                type="button"
                onClick={handleNext}
                className="w-full"
              >
                Devam Et →
              </Button>
            </>
          )}

          {/* ─── ADIM 2: Konum & Profil ──────────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <label htmlFor="gender" className={labelClass}>
                  Cinsiyet
                </label>
                <select
                  id="gender"
                  required
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}
                  className={inputClass}
                >
                  <option value="">Seçiniz</option>
                  <option value="MALE">Erkek</option>
                  <option value="FEMALE">Kadın</option>
                  <option value="PREFER_NOT_TO_SAY">Belirtmek istemiyorum</option>
                </select>
              </div>

              <div>
                <label htmlFor="birthDate" className={labelClass}>
                  Doğum Tarihi
                </label>
                <input
                  id="birthDate"
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className={inputClass}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Telefon <span className="text-gray-400 font-normal">(opsiyonel)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label htmlFor="country" className={labelClass}>
                  Ülke
                </label>
                <select
                  id="country"
                  required
                  value={form.countryId}
                  onChange={(e) => setForm({ ...form, countryId: e.target.value, cityId: "", districtId: "" })}
                  className={inputClass}
                  disabled={locLoading}
                >
                  <option value="">{locLoading ? "Yükleniyor..." : "Ülke seçiniz"}</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {form.countryId && (
                <div>
                  <label htmlFor="city" className={labelClass}>
                    Şehir
                  </label>
                  <select
                    id="city"
                    required
                    value={form.cityId}
                    onChange={(e) => setForm({ ...form, cityId: e.target.value, districtId: "" })}
                    className={inputClass}
                    disabled={!form.countryId || locLoading}
                  >
                    <option value="">{locLoading ? "Yükleniyor..." : "Şehir seçiniz"}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.cityId && (
                <div>
                  <label htmlFor="district" className={labelClass}>
                    İlçe
                  </label>
                  <select
                    id="district"
                    required
                    value={form.districtId}
                    onChange={(e) => setForm({ ...form, districtId: e.target.value })}
                    className={inputClass}
                    disabled={!form.cityId}
                  >
                    <option value="">İlçe seçiniz</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  ← Geri
                </button>
                <Button type="submit" loading={loading} className="flex-1">
                  Kayıt Ol
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-sm">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/auth/giris"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
