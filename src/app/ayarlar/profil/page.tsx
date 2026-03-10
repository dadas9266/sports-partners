"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilDuzenle() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profil");
  }, [router]);
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
    </div>
  );
}
