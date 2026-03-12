"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error";
  detail: string;
  count?: number;
}

interface HealthResult {
  overallStatus: "ok" | "warn" | "error";
  timestamp: string;
  checks: HealthCheck[];
  summary: { total: number; ok: number; warn: number; error: number };
}

const STATUS_ICON: Record<string, string> = {
  ok: "✅",
  warn: "⚠️",
  error: "❌",
};

const STATUS_COLOR: Record<string, string> = {
  ok: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  warn: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

const OVERALL_BG: Record<string, string> = {
  ok: "bg-emerald-500",
  warn: "bg-yellow-500",
  error: "bg-red-500",
};

export default function HealthPanel() {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error("API hatası");
      const data = await res.json();
      if (data.success) {
        setResult(data);
        toast.success("Sağlık testi tamamlandı");
      } else {
        toast.error(data.error ?? "Bilinmeyen hata");
      }
    } catch {
      toast.error("Sağlık testi başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">🏥 Sistem Sağlık Paneli</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Veritabanı bütünlüğü, i18n bütünlüğü ve veri tutarlılığı kontrolü
          </p>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Test Çalışıyor...
            </>
          ) : (
            <>🔍 Sistem Testi Başlat</>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Overall Status Badge */}
          <div className={`${OVERALL_BG[result.overallStatus]} rounded-2xl p-6 text-white text-center`}>
            <div className="text-4xl mb-2">
              {result.overallStatus === "ok" ? "🟢" : result.overallStatus === "warn" ? "🟡" : "🔴"}
            </div>
            <div className="text-2xl font-bold">
              {result.overallStatus === "ok" ? "Sistem Sağlıklı" : result.overallStatus === "warn" ? "Uyarı Var" : "Kritik Sorun!"}
            </div>
            <div className="text-sm opacity-90 mt-2">
              {result.summary.ok} başarılı · {result.summary.warn} uyarı · {result.summary.error} hata
            </div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(result.timestamp).toLocaleString("tr-TR")}
            </div>
          </div>

          {/* Check Cards */}
          <div className="space-y-3">
            {result.checks.map((check, i) => (
              <div
                key={i}
                className={`border rounded-xl p-4 ${STATUS_COLOR[check.status]}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{STATUS_ICON[check.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {check.name}
                      {check.count !== undefined && check.count > 0 && (
                        <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {check.count}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words whitespace-pre-wrap">
                      {check.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-6xl mb-4">🩺</div>
          <div className="text-lg font-medium">Henüz test çalıştırılmadı</div>
          <div className="text-sm mt-2">Yukarıdaki butona tıklayarak sistem testini başlatın</div>
        </div>
      )}
    </div>
  );
}
