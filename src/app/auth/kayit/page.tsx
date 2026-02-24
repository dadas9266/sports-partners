"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { registerUser } from "@/services/api";
import type { RegisterForm } from "@/types";
import Button from "@/components/ui/Button";
import { useLocations } from "@/hooks/useLocations";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const { locations } = useLocations();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    gender: "",
    cityId: "",
    districtId: "",
    birthDate: "",
  });
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [selectedCityId, setSelectedCityId] = useState<string>("");

  useEffect(() => {
    // Türkiye'yi varsayılan seç
    if (locations.length > 0 && !selectedCountryId) {
      const trCountry = locations.find(l => l.code === "TR");
      if (trCountry) setSelectedCountryId(trCountry.id);
    }
  }, [locations, selectedCountryId]);

  const filteredCities = (
    selectedCountryId 
      ? locations.find((l) => l.id === selectedCountryId)?.cities ?? []
      : []
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredDistricts = (
    selectedCityId
      ? filteredCities.find((c) => c.id === selectedCityId)?.districts ?? []
      : []
  ).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const passwordErrors = form.password
    ? [
        form.password.length < 8 && "En az 8 karakter",
        !/[A-Z]/.test(form.password) && "Büyük harf",
        !/[a-z]/.test(form.password) && "Küçük harf",
        !/[0-9]/.test(form.password) && "Rakam",
        !/[^A-Za-z0-9]/.test(form.password) && "Özel karakter",
      ].filter(Boolean) as string[]
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    if (passwordErrors.length > 0) {
      toast.error("Şifre gereksinimleri karşılanmıyor");
      return;
    }
    if (!form.cityId) {
      toast.error("Lütfen şehir seçiniz");
      return;
    }
    if (!form.districtId) {
      toast.error("Lütfen ilçe seçiniz");
      return;
    }
    if (!form.birthDate) {
      toast.error("Lütfen doğum tarihinizi giriniz");
      return;
    }
    if (!form.gender) {
      toast.error("Lütfen cinsiyet seçiniz");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        gender: form.gender as any,
        cityId: form.cityId,
        districtId: form.districtId,
        birthDate: form.birthDate,
      });
      // Auto sign-in and redirect to onboarding
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (res?.error) {
        toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
        router.push("/auth/giris");
      } else {
        toast.success("Hoş geldin! Önce birkaç tercihini ayarlıyalım.");
        router.push("/onboarding");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition shadow-sm";

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-10 w-full max-w-2xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Yeni Hesap Oluştur
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Spor topluluğumuza katılarak yeni partnerler bul.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Konum Bölümü */}
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-emerald-500 text-white p-1 rounded-md">📍</span>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">Konum Detayları</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="country" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase">
                  Ülke
                </label>
                <select
                  id="country"
                  className={inputClass}
                  value={selectedCountryId}
                  onChange={(e) => {
                    setSelectedCountryId(e.target.value);
                    setSelectedCityId("");
                    setForm({ ...form, cityId: "", districtId: "" });
                  }}
                >
                  <option value="">Ülke Seçiniz...</option>
                  {locations.sort((a,b) => a.code === "TR" ? -1 : b.code === "TR" ? 1 : a.name.localeCompare(b.name)).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase">
                    Şehir
                  </label>
                  <select
                    id="city"
                    value={selectedCityId}
                    required
                    onChange={(e) => {
                      setSelectedCityId(e.target.value);
                      setForm({ ...form, cityId: e.target.value, districtId: "" });
                    }}
                    className={inputClass}
                    disabled={!selectedCountryId}
                  >
                    <option value="">Şehir Seçiniz...</option>
                    {filteredCities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="district" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase">
                    İlçe
                  </label>
                  <select
                    id="district"
                    value={form.districtId}
                    required
                    onChange={(e) => setForm({ ...form, districtId: e.target.value })}
                    className={inputClass}
                    disabled={!selectedCityId}
                  >
                    <option value="">İlçe Seçiniz...</option>
                    {filteredDistricts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Kişisel Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Ad Soyad
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="Örn: Mehmet Öz"
                autoComplete="name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="mehmet@spor.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Telefon <span className="text-xs text-gray-400 font-normal">(opsiyonel)</span>
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
              <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Cinsiyet
              </label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                className={inputClass}
                required
              >
                <option value="">Seçiniz...</option>
                <option value="MALE">Erkek</option>
                <option value="FEMALE">Kadın</option>
                <option value="PREFER_NOT_TO_SAY">Belirtmek İstemiyorum</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Doğum Tarihi
              </label>
              <input
                id="birthDate"
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Şifre Bölümü */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <p className="text-[10px] text-gray-400 mt-1">Gereksinimler: 8+ krk, A, a, 1, !</p>
            </div>
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Şifre Tekrar
              </label>
              <input
                id="passwordConfirm"
                type="password"
                required
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                className={inputClass}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="text-xs text-red-500 mt-1">Şifreler eşleşmiyor</p>
              )}
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full py-4 text-lg font-bold shadow-emerald-200 dark:shadow-none transition-transform hover:scale-[1.01] active:scale-[0.99]">
            Hemen Katıl
          </Button>
        </form>

        <div className="mt-8 pt-6 text-center border-t border-gray-100 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/giris" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
