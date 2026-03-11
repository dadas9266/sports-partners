"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface ReferralData {
  code: string;
  referralCount: number;
  referrals: { id: string; name: string; avatarUrl: string | null; createdAt: string }[];
}

export default function ReferralPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/referral")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const handleCopy = async () => {
    if (!data) return;
    const url = `${window.location.origin}/auth/kayit?ref=${data.code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Davet linki kopyalandı!");
  };

  const handleApply = async () => {
    if (!applyCode.trim()) return;
    setApplying(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: applyCode.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setApplyCode("");
        // Refresh data
        const r = await fetch("/api/referral");
        const d = await r.json();
        if (d.success) setData(d.data);
      } else {
        toast.error(json.error || "Hata oluştu");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🎁 Arkadaşını Davet Et</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Arkadaşlarını davet et, her ikisi de +50 puan kazansın!
        </p>
      </div>

      {/* Davet Kodu */}
      {data && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Senin Davet Kodun</label>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-widest">
                {data.code}
              </span>
              <button
                onClick={handleCopy}
                className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition"
              >
                📋 Linki Kopyala
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-800 dark:text-gray-200">{data.referralCount}</span> kişi senin davetin ile katıldı
          </div>

          {/* Davet edilen kişiler */}
          {data.referrals.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Davet Ettiklerin</p>
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{r.name?.[0]?.toUpperCase() ?? "?"}</div>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kod Kullan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Bir Davet Kodun Var mı?</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={8}
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            onClick={handleApply}
            disabled={applying || !applyCode.trim()}
            className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {applying ? "..." : "Uygula"}
          </button>
        </div>
      </div>
    </div>
  );
}
