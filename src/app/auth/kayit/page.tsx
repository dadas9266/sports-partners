"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { registerUser } from "@/services/api";
import type { RegisterForm } from "@/types";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    gender: "",
  });

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
    setLoading(true);
    try {
      await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
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

  const inputClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition";

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">
          Kayıt Ol
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ad Soyad
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Ahmet Yılmaz"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              placeholder="En az 8 karakter"
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Büyük harf, küçük harf, rakam ve özel karakter içermelidir.
            </p>
            {form.password && passwordErrors.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {passwordErrors.map((err) => (
                  <li key={err} className="text-xs text-red-500">• {err} gerekli</li>
                ))}
              </ul>
            )}
            {form.password && passwordErrors.length === 0 && (
              <p className="text-xs text-green-500 mt-1">✓ Şifre gereksinimleri karşılanıyor</p>
            )}
          </div>
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şifre Tekrar
            </label>
            <input
              id="passwordConfirm"
              type="password"
              required
              value={form.passwordConfirm}
              onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
              className={inputClass}
              placeholder="Şifrenizi tekrar girin"
              autoComplete="new-password"
            />
            {form.passwordConfirm && form.password !== form.passwordConfirm && (
              <p className="text-xs text-red-500 mt-1">Şifreler eşleşmiyor</p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefon <span className="text-gray-400">(opsiyonel)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="05551234567"
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cinsiyet <span className="text-gray-400">(opsiyonel)</span>
            </label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}
              className={inputClass}
            >
              <option value="">Belirtmek İstemiyorum</option>
              <option value="MALE">Erkek</option>
              <option value="FEMALE">Kadın</option>
              <option value="OTHER">Diğer</option>
              <option value="PREFER_NOT_TO_SAY">Belirtmek İstemiyorum</option>
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Kayıt Ol
          </Button>
        </form>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-4 text-sm">
          Zaten hesabınız var mı?{" "}
          <Link href="/auth/giris" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
