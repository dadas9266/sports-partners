"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocations, useSports } from "@/hooks/useLocations";
import { useDebounce } from "@/hooks/useDebounce";
import LocationSelector from "./LocationSelector";
import type { Country, Sport } from "@/types";

type FilterBarProps = {
  onFilterChange: (filters: Record<string, string>) => void;
  initialLocations?: Country[];
  initialSports?: Sport[];
};

export default function FilterBar({ onFilterChange, initialLocations, initialSports }: FilterBarProps) {
  // Use SSR data if provided, otherwise fallback to client-side fetch
  const { locations: fetchedLocations, error: locError } = useLocations();
  const { sports: fetchedSports, error: sportError } = useSports();
  
  const locations = initialLocations?.length ? initialLocations : fetchedLocations;
  const sports = initialSports?.length ? initialSports : fetchedSports;

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [datePreset, setDatePreset] = useState("");

  const cities = locations.find((l) => l.id === selectedCountry)?.cities || [];
  const districts = cities.find((c) => c.id === selectedCity)?.districts || [];

  const isFirstRender = useRef(true);

  // Auto-select Turkey when locations load (works across any DB environment)
  useEffect(() => {
    if (locations.length > 0 && !selectedCountry) {
      const turkey = locations.find((l) => l.name === "Türkiye");
      if (turkey) setSelectedCountry(turkey.id);
    }
  }, [locations, selectedCountry]);

  const filterInput = useMemo(
    () => ({ selectedSport, selectedDistrict, selectedCity, selectedCountry, selectedLevel, selectedType, minPrice, maxPrice, isRecurring, datePreset }),
    [selectedSport, selectedDistrict, selectedCity, selectedCountry, selectedLevel, selectedType, minPrice, maxPrice, isRecurring, datePreset]
  );

  const debouncedFilters = useDebounce(filterInput, 300);

  useEffect(() => {
    // İlk renderda boş filtre ile yükleme yap, sonraki değişikliklerde debounce uygula
    const filters: Record<string, string> = {};
    if (debouncedFilters.selectedSport) filters.sportId = debouncedFilters.selectedSport;
    if (debouncedFilters.selectedDistrict) filters.districtId = debouncedFilters.selectedDistrict;
    if (debouncedFilters.selectedCity) filters.cityId = debouncedFilters.selectedCity;
    if (debouncedFilters.selectedCountry) filters.countryId = debouncedFilters.selectedCountry;
    if (debouncedFilters.selectedLevel) filters.level = debouncedFilters.selectedLevel;
    if (debouncedFilters.selectedType) filters.type = debouncedFilters.selectedType;
    if (debouncedFilters.minPrice) filters.minPrice = debouncedFilters.minPrice;
    if (debouncedFilters.maxPrice) filters.maxPrice = debouncedFilters.maxPrice;
    if (debouncedFilters.isRecurring) filters.isRecurring = "true";
    if (debouncedFilters.datePreset) {
      const now = new Date();
      if (debouncedFilters.datePreset === "today") {
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        filters.dateFrom = now.toISOString();
        filters.dateTo = end.toISOString();
      } else if (debouncedFilters.datePreset === "week") {
        const end = new Date(now); end.setDate(now.getDate() + 7);
        filters.dateFrom = now.toISOString();
        filters.dateTo = end.toISOString();
      } else if (debouncedFilters.datePreset === "weekend") {
        const day = now.getDay();
        const daysToSat = day === 6 ? 0 : (6 - day);
        const sat = new Date(now); sat.setDate(now.getDate() + daysToSat); sat.setHours(0, 0, 0, 0);
        const sun = new Date(sat); sun.setDate(sat.getDate() + 1); sun.setHours(23, 59, 59, 999);
        filters.dateFrom = sat.toISOString();
        filters.dateTo = sun.toISOString();
      }
    }
    onFilterChange(filters);
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters]);

  const resetFilters = () => {
    setSelectedCountry("");
    setSelectedCity("");
    setSelectedDistrict("");
    setSelectedSport("");
    setSelectedLevel("");
    setSelectedType("");
    setMinPrice("");
    setMaxPrice("");
    setIsRecurring(false);
    setDatePreset("");
  };

  const selectClass =
    "border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:opacity-60 transition";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
          🔍 İlanları Filtrele
        </h2>
        <div className="flex items-center gap-3">
          {(locError || sportError) && (
            <span className="text-xs text-red-500">{locError || sportError}</span>
          )}
          <button
            onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            aria-label="Filtreleri temizle"
          >
            Temizle
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Konum Seçimi (Ülke, Şehir, İlçe) */}
        <LocationSelector
          countryId={selectedCountry}
          cityId={selectedCity}
          districtId={selectedDistrict}
          onChange={(updates) => {
            if (updates.countryId !== undefined) setSelectedCountry(updates.countryId);
            if (updates.cityId !== undefined) setSelectedCity(updates.cityId);
            if (updates.districtId !== undefined) setSelectedDistrict(updates.districtId);
          }}
          showLabels={false}
          className="contents"
          selectClass={selectClass}
        />

        {/* Spor */}
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className={selectClass}
          aria-label="Spor dalı seçin"
        >
          <option value="">Spor Dalı</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>

        {/* Seviye */}
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className={selectClass}
          aria-label="Seviye seçin"
        >
          <option value="">Seviye</option>
          <option value="BEGINNER">Başlangıç</option>
          <option value="INTERMEDIATE">Orta</option>
          <option value="ADVANCED">İleri</option>
        </select>

        {/* Tip */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={selectClass}
          aria-label="İlan tipi seçin"
        >
          <option value="">İlan Tipi</option>
          <option value="RIVAL">Rakip Arıyor</option>
          <option value="PARTNER">Partner Arıyor</option>
          <option value="TRAINER">Eğitmen</option>
          <option value="EQUIPMENT">Satılık Malzeme</option>
        </select>
      </div>

      {/* Satır 2: Hızlı tarih seçenekleri + fiyat aralığı + tekrarlayan */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {/* Hızlı Tarih */}
        <div className="flex gap-1">
          {([{ id: "today", label: "Bugün" }, { id: "week", label: "Bu Hafta" }, { id: "weekend", label: "Hafta Sonu" }] as const).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDatePreset(prev => prev === p.id ? "" : p.id)}
              className={`px-3 py-1.5 text-xs rounded-full border transition font-medium ${
                datePreset === p.id
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400 dark:hover:border-emerald-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Fiyat Aralığı — yalnızca EQUIPMENT veya TRAINER seçiliyken ya da tip seçilmemişse */}
        {(!selectedType || selectedType === "EQUIPMENT" || selectedType === "TRAINER") && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">💰 Fiyat</span>
            <input
              type="number"
              min={0}
              placeholder="Min ₺"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="number"
              min={0}
              placeholder="Max ₺"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}

        {/* Tekrarlayan Etkinlik */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
            className="accent-emerald-500 w-4 h-4"
          />
          <span className="text-xs text-gray-600 dark:text-gray-300">🔄 Tekrarlayan</span>
        </label>
      </div>

      </div>
    </div>
  );
}
