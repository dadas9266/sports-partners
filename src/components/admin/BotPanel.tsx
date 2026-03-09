"use client";

import { useEffect, useCallback, useState } from "react";
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

interface Country {
  id: string;
  name: string;
  cities: { id: string; name: string }[];
}

interface Sport {
  id: string;
  name: string;
  icon: string | null;
}

interface BotPanelProps {
  bots: Bot[];
  setBots: (b: Bot[]) => void;
  botTasks: BotTask[];
  setBotTasks: (t: BotTask[]) => void;
  botsLoading: boolean;
  setBotsLoading: (v: boolean) => void;
  botForm: { name: string; gender: string; birthYear: number; cityId: string; botPersona: string; sportIds: string[] };
  setBotForm: (f: BotPanelProps["botForm"]) => void;
  taskForm: { listingBotId: string; responderBotId: string; cityId: string; sportId: string; delaySeconds: number; bulk: boolean; countryId: string };
  setTaskForm: (f: BotPanelProps["taskForm"]) => void;
  taskRunning: boolean;
  setTaskRunning: (v: boolean) => void;
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
  const [countries, setCountries] = useState<Country[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [botCountryId, setBotCountryId] = useState("");

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(j => { if (j.success) setCountries(j.data); });
    fetch("/api/sports").then(r => r.json()).then(j => { if (j.success) setSports(j.data); });
  }, []);

  const botCities = countries.find(c => c.id === botCountryId)?.cities ?? [];
  const taskCities = countries.find(c => c.id === taskForm.countryId)?.cities ?? [];

  const fetchBots = useCallback(async () => {
    setBotsLoading(true);
    try {
      const res = await fetch("/api/admin/bots");
      const json = await res.json();
      if (json.success) setBots(json.data);
    } finally { setBotsLoading(false); }
  }, [setBots, setBotsLoading]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/admin/bot-tasks");
    const json = await res.json();
    if (json.success) setBotTasks(json.data);
  }, [setBotTasks]);

  useEffect(() => { fetchBots(); fetchTasks(); }, [fetchBots, fetchTasks]);

  async function createBot() {
    if (!botForm.name.trim()) { toast.error("Bot adi zorunlu"); return; }
    if (!botForm.cityId) { toast.error("Sehir secimi zorunlu"); return; }
    const res = await fetch("/api/admin/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(botForm),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Bot olusturuldu: " + json.data.name);
      setBotForm({ name: "", gender: "MALE", birthYear: 1995, cityId: "", botPersona: "", sportIds: [] });
      setBotCountryId("");
      fetchBots();
    } else { toast.error(json.error ?? "Bot olusturma hatasi"); }
  }

  async function deleteBot(id: string) {
    if (!confirm("Bu botu silmek istiyor musun?")) return;
    const res = await fetch(`/api/admin/bots?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) { toast.success("Bot silindi"); fetchBots(); }
    else toast.error(json.error ?? "Hata");
  }

  async function runTask() {
    if (!taskForm.listingBotId || !taskForm.responderBotId) { toast.error("Iki botu da sec"); return; }
    if (taskForm.listingBotId === taskForm.responderBotId) { toast.error("Ayni bot iki gorev alamaz"); return; }
    if (!taskForm.bulk && !taskForm.cityId) { toast.error("Sehir sec"); return; }
    if (taskForm.bulk && !taskForm.countryId) { toast.error("Toplu modda ulke sec"); return; }
    setTaskRunning(true);
    try {
      const res = await fetch("/api/admin/bot-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      const json = await res.json();
      if (json.success) { toast.success(json.message); fetchTasks(); }
      else toast.error(json.error ?? "Gorev hatasi");
    } finally { setTaskRunning(false); }
  }

  function toggleSport(sportId: string) {
    const ids = botForm.sportIds.includes(sportId)
      ? botForm.sportIds.filter(id => id !== sportId)
      : [...botForm.sportIds, sportId];
    setBotForm({ ...botForm, sportIds: ids });
  }

  return (
    <div className="space-y-8">
      {/* Bot Olusturma */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Robot Yeni Bot Olustur</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bot Adi *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="or: Ahmet Y." value={botForm.name} onChange={e => setBotForm({ ...botForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cinsiyet *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={botForm.gender} onChange={e => setBotForm({ ...botForm, gender: e.target.value })}>
              <option value="MALE">Erkek</option>
              <option value="FEMALE">Kadin</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Dogum Yili *</label>
            <input type="number" min={1960} max={2008} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={botForm.birthYear} onChange={e => setBotForm({ ...botForm, birthYear: parseInt(e.target.value) || 1995 })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ulke *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={botCountryId} onChange={e => { setBotCountryId(e.target.value); setBotForm({ ...botForm, cityId: "" }); }}>
              <option value="">Ulke sec...</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sehir *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={botForm.cityId} onChange={e => setBotForm({ ...botForm, cityId: e.target.value })} disabled={!botCountryId}>
              <option value="">{botCountryId ? "Sehir sec..." : "Once ulke sec"}</option>
              {botCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kisilik (opsiyonel)</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="or: genc-rekabetci" value={botForm.botPersona} onChange={e => setBotForm({ ...botForm, botPersona: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-gray-500 mb-2 block">Sporlar (secim yapabilirsin)</label>
          <div className="flex flex-wrap gap-2">
            {sports.map(s => {
              const sel = botForm.sportIds.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleSport(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${sel ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"}`}>
                  {s.icon && <span className="mr-1">{s.icon}</span>}{s.name}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={createBot} className="mt-4 bg-emerald-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-emerald-700 transition">+ Bot Olustur</button>
      </div>

      {/* Gorev Formu */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-1">Gorev Olustur ve Calistir</h2>
        <p className="text-xs text-gray-500 mb-4">Ilan botu ilan acar, Basvuru botu basvuru yapar, otomatik eslestirme olusturulur.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ilan Acacak Bot *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={taskForm.listingBotId} onChange={e => setTaskForm({ ...taskForm, listingBotId: e.target.value })}>
              <option value="">Bot sec...</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city?.name ?? "Sehirsiz"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ilana Basvuracak Bot *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={taskForm.responderBotId} onChange={e => setTaskForm({ ...taskForm, responderBotId: e.target.value })}>
              <option value="">Bot sec...</option>
              {bots.filter(b => b.id !== taskForm.listingBotId).map(b => <option key={b.id} value={b.id}>{b.name} — {b.city?.name ?? "Sehirsiz"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Spor (opsiyonel)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={taskForm.sportId} onChange={e => setTaskForm({ ...taskForm, sportId: e.target.value })}>
              <option value="">Botun sporunu kullan</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="bulkMode" checked={taskForm.bulk} onChange={e => setTaskForm({ ...taskForm, bulk: e.target.checked, cityId: "", countryId: "" })} className="w-4 h-4" />
            <label htmlFor="bulkMode" className="text-sm font-medium">Toplu Mod (ulkedeki tum sehirler)</label>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{taskForm.bulk ? "Ulke (toplu mod) *" : "Ulke"}</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={taskForm.countryId} onChange={e => setTaskForm({ ...taskForm, countryId: e.target.value, cityId: "" })}>
              <option value="">Ulke sec...</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!taskForm.bulk && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sehir *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={taskForm.cityId} onChange={e => setTaskForm({ ...taskForm, cityId: e.target.value })} disabled={!taskForm.countryId}>
                <option value="">{taskForm.countryId ? "Sehir sec..." : "Once ulke sec"}</option>
                {taskCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Basvuru Gecikmesi (sn)</label>
            <input type="number" min={5} max={3600} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" value={taskForm.delaySeconds} onChange={e => setTaskForm({ ...taskForm, delaySeconds: parseInt(e.target.value) || 30 })} />
          </div>
        </div>
        <button onClick={runTask} disabled={taskRunning} className="mt-4 bg-blue-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
          {taskRunning ? "Calisiyor..." : "Gorevi Baslat"}
        </button>
      </div>

      {/* Bot Listesi */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Bot Havuzu ({bots.length})</h2>
          <button onClick={fetchBots} className="text-xs text-emerald-600 hover:underline">Yenile</button>
        </div>
        {botsLoading ? <p className="text-sm text-gray-500">Yukleniyor...</p> : bots.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Henuz bot yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="pb-2 pr-4">Ad</th><th className="pb-2 pr-4">Cinsiyet</th><th className="pb-2 pr-4">Sehir</th><th className="pb-2 pr-4">Sporlar</th><th className="pb-2 pr-4">Kisilik</th><th className="pb-2 pr-4">Ilanlar</th><th className="pb-2 pr-4">Maclar</th><th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {bots.map(b => (
                  <tr key={b.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-4 font-medium">{b.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{b.gender === "MALE" ? "Erkek" : "Kadin"}</td>
                    <td className="py-2 pr-4 text-gray-500">{b.city?.name ?? "-"}</td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{b.sports.length > 0 ? b.sports.map(s => s.icon ?? s.name).join(" ") : "-"}</td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{b.botPersona ?? "-"}</td>
                    <td className="py-2 pr-4">{b._count.listings}</td>
                    <td className="py-2 pr-4">{b._count.matches1 + b._count.matches2}</td>
                    <td className="py-2"><button onClick={() => deleteBot(b.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Sil</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gorev Gecmisi */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Gorev Gecmisi ({botTasks.length})</h2>
          <button onClick={fetchTasks} className="text-xs text-emerald-600 hover:underline">Yenile</button>
        </div>
        {botTasks.length === 0 ? <p className="text-sm text-gray-400 italic">Henuz gorev yok.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="pb-2 pr-4">Durum</th><th className="pb-2 pr-4">Ilan Botu</th><th className="pb-2 pr-4">Basvuru Botu</th><th className="pb-2 pr-4">Sehir</th><th className="pb-2 pr-4">Spor</th><th className="pb-2 pr-4">Tarih</th><th className="pb-2">Sonuc</th>
                </tr>
              </thead>
              <tbody>
                {botTasks.map(t => (
                  <tr key={t.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLOR[t.status] ?? "bg-gray-100 text-gray-700"}`}>{t.status}</span></td>
                    <td className="py-2 pr-4">{t.listingBot.name}</td>
                    <td className="py-2 pr-4">{t.responderBot.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{t.city?.name ?? "-"}</td>
                    <td className="py-2 pr-4 text-gray-500">{t.sport ? `${t.sport.icon ?? ""} ${t.sport.name}` : "-"}</td>
                    <td className="py-2 pr-4 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td className="py-2 text-xs max-w-[200px] truncate">
                      {t.errorMessage ? <span className="text-red-500">{t.errorMessage}</span> : t.matchId ? <span className="text-green-600">Mac olusturuldu</span> : "-"}
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
