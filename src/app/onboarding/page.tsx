"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { updateProfile, getSports } from "@/services/api";
import type { Sport } from "@/types";
import Button from "@/components/ui/Button";

const STEPS = [
  { id: "sports", title: "Hangi sporları yapıyorsun?", emoji: "🏅" },
  { id: "time", title: "Ne zaman spor yapmayı seversin?", emoji: "⏰" },
  { id: "style", title: "Nasıl spor yaparsın?", emoji: "🎯" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [prefs, setPrefs] = useState({
    preferredTime: "",
    preferredStyle: "",
    sportIds: [] as string[],
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/giris");
  }, [status, router]);

  useEffect(() => {
    getSports().then((res) => {
      if (res.success && res.data) setSports(res.data);
    });
  }, []);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        preferredTime: prefs.preferredTime || undefined,
        preferredStyle: prefs.preferredStyle || undefined,
        sportIds: prefs.sportIds.length > 0 ? prefs.sportIds : undefined,
        onboardingDone: true,
      } as Parameters<typeof updateProfile>[0]);
      toast.success("Profil tercihlerin kaydedildi! 🎉");
      router.push("/");
    } catch {
      toast.error("Bir hata oluştu, daha sonra tekrar deneyebilirsiniz");
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return prefs.sportIds.length > 0;
    if (step === 1) return !!prefs.preferredTime;
    if (step === 2) return !!prefs.preferredStyle;
    return false;
  };

  if (status === "loading") return null;
  if (!session) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-10 bg-emerald-500"
                  : i < step
                  ? "w-10 bg-emerald-300"
                  : "w-10 bg-gray-200 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-8">
          <span className="text-5xl" role="img" aria-label="emoji">
            {STEPS[step].emoji}
          </span>
          <h2 className="mt-3 text-xl font-bold text-gray-800 dark:text-gray-100">
            {STEPS[step].title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Adım {step + 1} / {STEPS.length}
          </p>
        </div>

        {/* Step 0 — Sporlar */}
        {step === 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
              En fazla 10 spor seçebilirsin
              {prefs.sportIds.length > 0 && (
                <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">{prefs.sportIds.length}/10</span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {sports.map((sport) => {
                const selected = prefs.sportIds.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setPrefs({ ...prefs, sportIds: prefs.sportIds.filter((id) => id !== sport.id) });
                      } else if (prefs.sportIds.length >= 10) {
                        toast.error("En fazla 10 spor dalı seçebilirsiniz");
                      } else {
                        setPrefs({ ...prefs, sportIds: [...prefs.sportIds, sport.id] });
                      }
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                    }`}
                  >
                    <span className="text-lg mr-1">{sport.icon || "🏅"}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sport.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1 — Tercih Zamanı */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3">
            {[
              { value: "morning", label: "🌅 Sabah", desc: "Güne erken başlarım" },
              { value: "evening", label: "🌆 Akşam", desc: "Günün yorgunluğunu çıkarırım" },
              { value: "anytime", label: "🕐 Fark Etmez", desc: "Her zaman uygunum" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPrefs({ ...prefs, preferredTime: opt.value })}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  prefs.preferredTime === opt.value
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                }`}
              >
                <span className="font-medium text-gray-800 dark:text-gray-100">{opt.label}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Tarz */}
        {step === 2 && (
          <div className="grid grid-cols-1 gap-3">
            {[
              { value: "competitive", label: "🏆 Rekabetçi", desc: "Kazanmayı severim" },
              { value: "casual", label: "😎 Eğlenceli", desc: "Keyif için oynarım" },
              { value: "both", label: "⚡ Her İkisi", desc: "Duruma göre değişir" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPrefs({ ...prefs, preferredStyle: opt.value })}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  prefs.preferredStyle === opt.value
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                }`}
              >
                <span className="font-medium text-gray-800 dark:text-gray-100">{opt.label}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              ← Geri
            </button>
          ) : (
            <div />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              İleri →
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              loading={saving}
              disabled={!canProceed()}
            >
              Tamamla 🎉
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
