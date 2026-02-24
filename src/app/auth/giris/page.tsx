"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import type { LoginForm } from "@/types";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Giriş başarılı!");
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition";

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">
          Giriş Yap
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Giriş Yap
          </Button>
        </form>
        <div className="mt-3 text-center">
          <Link href="/auth/sifre-sifirla" className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">
            Şifremi unuttum
          </Link>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-3 text-sm">
          Hesabınız yok mu?{" "}
          <Link href="/auth/kayit" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
