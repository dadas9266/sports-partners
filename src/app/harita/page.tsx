"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import FilterBar from "@/components/FilterBar";
import { getListings } from "@/services/api";
import type { ListingSummary } from "@/types";

// Leaflet CSS — must be imported in browser
import "leaflet/dist/leaflet.css";

// Dynamic import to avoid SSR issues with Leaflet
const ListingsMap = dynamic(
  () => import("@/components/ListingsMap"),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800" style={{ minHeight: 400 }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  ) }
);

export default function HaritaPage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = async (filters: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const res = await getListings(filters, 1, 100);
      if (res.success && res.data) setListings(res.data);
    } catch {
      toast.error("İlanlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadListings(); }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🗺️ İlanlar Haritası</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Çevrendeki spor ilanlarını harita üzerinde gör</p>
      </div>

      <FilterBar onFilterChange={(f) => loadListings(f)} />

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800" style={{ minHeight: 400 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : (
          <ListingsMap listings={listings} className="w-full" />
        )}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
        {listings.length} ilan gösteriliyor • OpenStreetMap verisi
      </p>
    </div>
  );
}
