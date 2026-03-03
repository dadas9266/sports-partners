import { useEffect, useState } from "react";

export function useActivityCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchCounts() {
      try {
        const [aktRes, challengesRes] = await Promise.all([
          fetch("/api/aktivitelerim").then((r) => r.json()),
          fetch("/api/challenges?direction=received").then((r) => r.json()),
        ]);
        let total = 0;
        if (aktRes.success) {
          // İlanlarım: açık ilanlar
          total += (aktRes.data.listings ?? []).filter((l: any) => l.status === "OPEN").length;
          // Başvurularım: bekleyen başvurular
          total += (aktRes.data.responses ?? []).filter((r: any) => r.status === "PENDING").length;
          // Eşleşmeler: onay veya puan bekleyen
          total += (aktRes.data.matches ?? []).filter((m: any) => (!m.iHaveConfirmed && m.status !== "COMPLETED" && m.status !== "CANCELLED") || (m.status === "COMPLETED" && !m.iHaveRated)).length;
        }
        if (challengesRes.success) {
          // Tekliflerim: gelen teklifler
          total += (challengesRes.data ?? []).length;
        }
        if (!cancelled) setCount(total);
      } catch {
        if (!cancelled) setCount(0);
      }
    }
    fetchCounts();
    // Her 60sn'de bir güncelle
    const interval = setInterval(fetchCounts, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return count;
}
