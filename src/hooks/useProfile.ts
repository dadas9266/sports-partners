import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getProfile } from "@/services/api";
import type { ProfileData } from "@/types";

export function useProfile() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session) {
      setLoading(true);
      getProfile()
        .then((d) => {
          if (d.success && d.data) setData(d.data);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Profil yüklenemedi"))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [session, status]);

  const refresh = () => {
    if (!session) return;
    setLoading(true);
    getProfile()
      .then((d) => {
        if (d.success && d.data) setData(d.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Profil yüklenemedi"))
      .finally(() => setLoading(false));
  };

  return { data, loading, error, status, session, refresh, setData };
}
