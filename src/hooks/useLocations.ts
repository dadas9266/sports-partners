import { useEffect, useState } from "react";
import type { Country, Sport } from "@/types";
import { getLocations as fetchLocations, getSports as fetchSports } from "@/services/api";

export function useLocations() {
  const [locations, setLocations] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations()
      .then((d) => d.success && setLocations(d.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Konumlar yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  return { locations, loading, error };
}

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSports()
      .then((d) => d.success && setSports(d.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Sporlar yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  return { sports, loading, error };
}
