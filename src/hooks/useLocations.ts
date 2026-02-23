import { useEffect, useState } from "react";
import type { Country, Sport, Venue } from "@/types";
import { getLocations as fetchLocations, getSports as fetchSports, getVenues as fetchVenues } from "@/services/api";

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

export function useVenues(districtId: string) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!districtId) {
      setVenues([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchVenues(districtId)
      .then((d) => d.success && setVenues(d.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Tesisler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [districtId]);

  return { venues, loading, error };
}
