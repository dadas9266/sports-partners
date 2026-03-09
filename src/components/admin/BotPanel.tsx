"use client";

import { useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface Bot {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  gender: string;
  birthDate: string | null;
  botPersona: string | null;
  city: { id: string; name: string; country: { id: string; name: string } } | null;
  sports: { id: string; name: string; icon: string | null }[];
  _count: { listings: number; matches1: number; matches2: number };
}

interface BotTask {
  id: string;
  status: string;
  listingBot: { name: string };
  responderBot: { name: string };
  city: { name: string } | null;
  sport: { name: string; icon: string | null } | null;
  listingId: string | null;
  matchId: string | null;
  errorMessage: string | null;
  createdAt: string;
  executedAt: string | null;
}

interface BotPanelProps {
  bots: Bot[];
  setBots: (b: Bot[]) => void;
  botTasks: BotTask[];
  setBotTasks: (t: BotTask[]) => void;
  botsLoading: boolean;
  setBotsLoading: (v: boolean) => void;
  botForm: { name: string; gender: string; birthYear: number; cityId: string; botPersona: string };
  setBotForm: (f: BotPanelProps["botForm"]) => void;
  taskForm: { listingBotId: string; responderBotId: string; cityId: string; sportId: string; delaySeconds: number; bulk: boolean; countryId: string };
  setTaskForm: (f: BotPanelProps["taskForm"]) => void;
  taskRunning: boolean;
  setTaskRunning: (v: boolean) => void;
  locations: { id: string; name: string; cities: { id: string; name: string }[] }[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  LISTING_CREATED: "bg-blue-100 text-blue-800",
  RESPONSE_SENT: "bg-purple-100 text-purple-800",
  MATCH_DONE: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export default function BotPanel({
  bots, setBots, botTasks, setBotTasks,
  botsLoading, setBotsLoading,
  botForm, setBotForm,
  taskForm, setTaskForm,
  taskRunning, setTaskRunning,
}: BotPanelProps) {

  const fetchBots = useCallback(async () => {
    setBotsLoading(true);
    try {
      const res = await fetch("/api/admin/bots");
      const json = await res.json();
      if (json.success) setBots(json.data);
    } finally {
      setBotsLoading(false);
    }
  }, [setBots, setBotsLoading]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/admin/bot-tasks");
    const json = await res.json();
    if (json.success) setBotTasks(json.data);
  }, [setBotTasks]);

  useEffect(() => {
    fetchBots();
    fetchTasks();
  }, [fetchBots, fetchTasks]);

  async function createBot() {
    if (!botForm.name || !botForm.cityId) {
      toast.error("Ad ve şehir zorunlu");
      return;
    }
    const res = await fetch("/api/admin/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(botForm),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Bot oluşturuldu");
      setBotForm({ name: "", gender: "MALE", birthYear: 1990, cityId: "", botPersona: "" });
      fetchBots();
    } else {
      toast.error(json.error ?? "Hata");
    }
  }

  async function deleteBot(id: string) {
    if (!confirm("Bu botu ve tüm verilerini silmek istiyor musun?")) return;
    const res = await fetch(`/api/admin/bots?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) { toast.success("Bot silindi"); fetchBots(); }
    else toast.error(json.error ?? "Hata");
  }

  async function runTask() {
    if (!taskForm.listingBotId || !taskForm.responderBotId) {
      toast.error("İlan botu ve başvuru botu seçmelisin");
      return;
    }
    if (!taskForm.bulk && !taskForm.cityId) {
      toast.error("Şehir seçmelisin (veya Toplu modu aç)");
      return;
    }
    if (taskForm.bulk && !taskForm.countryId) {
      toast.error("Toplu modda ülke seçmelisin");
      return;
    }
    setTaskRunning(true);
    try {
      const res = await fetch("/api/admin/bot-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchTasks();
      } else {
        toast.error(json.error ?? "Hata");
      }
    } finally {
      setTaskRunning(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Bot Oluşturma Formu ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">🤖 Yeni Bot Oluştur</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            placeholder="Bot adı (ör: Ahmet Y.)"
            value={botForm.name}
            onChange={e => setBotForm({ ...botForm, name: e.target.value })}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            value={botForm.gender}
            onChange={e => setBotForm({ ...botForm, gender: e.target.value })}
          >
            <option value="MALE">Erkek</option>
            <option value="FEMALE">Kadın</option>
          </select>
          <input
            type="number"
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            placeholder="Doğum yılı (ör: 1990)"
            value={botForm.birthYear}
            onChange={e => setBotForm({ ...botForm, birthYear: parseInt(e.target.value) || 1990 })}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            placeholder="Şehir ID (Prisma'dan kopyala)"
            value={botForm.cityId}
            onChange={e => setBotForm({ ...botForm, cityId: e.target.value })}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            placeholder="Kişilik (ör: genç-rekabetçi)"
            value={botForm.botPersona}
            onChange={e => setBotForm({ ...botForm, botPersona: e.target.value })}
          />
          <button
            onClick={createBot}
            className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-700 transition"
          >
            + Oluştur
          </button>
        </div>
      </div>

      {/* ── Görev Oluşturma Formu ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">⚡ Görev Oluştur &amp; Çalıştır</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">İlan Açacak Bot</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
              value={taskForm.listingBotId}
              onChange={e => setTaskForm({ ...taskForm, listingBotId: e.target.value })}
            >
              <option value="">Seç...</option>
              {bots.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city?.name ?? "?"})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Başvuru Yapacak Bot</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
              value={taskForm.responderBotId}
              onChange={e => setTaskForm({ ...taskForm, responderBotId: e.target.value })}
            >
              <option value="">Seç...</option>
              {bots.filter(b => b.id !== taskForm.listingBotId).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city?.name ?? "?"})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gecikme (sn)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
              value={taskForm.delaySeconds}
              onChange={e => setTaskForm({ ...taskForm, delaySeconds: parseInt(e.target.value) || 30 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bulkMode"
              checked={taskForm.bulk}
              onChange={e => setTaskForm({ ...taskForm, bulk: e.target.checked })}
            />
            <label htmlFor="bulkMode" className="text-sm font-medium">Toplu Mod (Tüm Türkiye)</label>
          </div>
          {taskForm.bulk ? (
            <input
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ülke ID"
              value={taskForm.countryId}
              onChange={e => setTaskForm({ ...taskForm, countryId: e.target.value })}
            />
          ) : (
            <input
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
              placeholder="Şehir ID"
              value={taskForm.cityId}
              onChange={e => setTaskForm({ ...taskForm, cityId: e.target.value })}
            />
          )}
          <button
            onClick={runTask}
            disabled={taskRunning}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {taskRunning ? "⏳ Çalışıyor..." : "▶ Görevi Başlat"}
          </button>
        </div>
      </div>

      {/* ── Bot Listesi ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Bot Havuzu ({bots.length})</h2>
          <button onClick={fetchBots} className="text-xs text-emerald-600 hover:underline">Yenile</button>
        </div>
        {botsLoading ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : bots.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz bot yok. Yukarıdan oluşturabilirsin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="pb-2 pr-4">Ad</th>
                  <th className="pb-2 pr-4">Şehir</th>
                  <th className="pb-2 pr-4">Kişilik</th>
                  <th className="pb-2 pr-4">İlansayı</th>
                  <th className="pb-2 pr-4">Maçlar</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {bots.map(b => (
                  <tr key={b.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-4 font-medium">{b.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{b.city?.name ?? "-"}</td>
                    <td className="py-2 pr-4 text-gray-500">{b.botPersona ?? "-"}</td>
                    <td className="py-2 pr-4">{b._count.listings}</td>
                    <td className="py-2 pr-4">{b._count.matches1 + b._count.matches2}</td>
                    <td className="py-2">
                      <button
                        onClick={() => deleteBot(b.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Görev Geçmişi ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Görev Geçmişi ({botTasks.length})</h2>
          <button onClick={fetchTasks} className="text-xs text-emerald-600 hover:underline">Yenile</button>
        </div>
        {botTasks.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz görev yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="pb-2 pr-4">Durum</th>
                  <th className="pb-2 pr-4">İlan Botu</th>
                  <th className="pb-2 pr-4">Başvuru Botu</th>
                  <th className="pb-2 pr-4">Şehir</th>
                  <th className="pb-2 pr-4">Tarih</th>
                  <th className="pb-2">Notlar</th>
                </tr>
              </thead>
              <tbody>
                {botTasks.map(t => (
                  <tr key={t.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLOR[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{t.listingBot.name}</td>
                    <td className="py-2 pr-4">{t.responderBot.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{t.city?.name ?? "-"}</td>
                    <td className="py-2 pr-4 text-gray-400 text-xs">
                      {new Date(t.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-2 text-xs text-red-500 max-w-[200px] truncate">
                      {t.errorMessage ?? (t.matchId ? `✅ Maç: ${t.matchId.slice(0, 8)}...` : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
