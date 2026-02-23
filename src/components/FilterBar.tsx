"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocations, useSports } from "@/hooks/useLocations";
import { useDebounce } from "@/hooks/useDebounce";

type FilterBarProps = {
  onFilterChange: (filters: Record<string, string>) => void;
};

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const { locations, error: locError } = useLocations();
  const { sports, error: sportError } = useSports();

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const cities = locations.find((l) => l.id === selectedCountry)?.cities || [];
  const districts = cities.find((c) => c.id === selectedCity)?.districts || [];

  const isFirstRender = useRef(true);

  const filterInput = useMemo(
    () => ({ selectedSport, selectedDistrict, selectedCity, selectedLevel, selectedType }),
    [selectedSport, selectedDistrict, selectedCity, selectedLevel, selectedType]
  );

  const debouncedFilters = useDebounce(filterInput, 300);

  useEffect(() => {
    // İlk renderda boş filtre ile yükleme yap, sonraki değişikliklerde debounce uygula
    const filters: Record<string, string> = {};
    if (debouncedFilters.selectedSport) filters.sportId = debouncedFilters.selectedSport;
    if (debouncedFilters.selectedDistrict) filters.districtId = debouncedFilters.selectedDistrict;
    else if (debouncedFilters.selectedCity) filters.cityId = debouncedFilters.selectedCity;
    if (debouncedFilters.selectedLevel) filters.level = debouncedFilters.selectedLevel;
    if (debouncedFilters.selectedType) filters.type = debouncedFilters.selectedType;
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
  };

  const selectClass =
    "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700 transition";

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6"
      role="search"
      aria-label="İlan filtreleri"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">
          <span role="img" aria-label="ara">🔍</span> Filtrele
        </h2>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Ülke */}
        <select
          value={selectedCountry}
          onChange={(e) => {
            setSelectedCountry(e.target.value);
            setSelectedCity("");
            setSelectedDistrict("");
          }}
          className={selectClass}
          aria-label="Ülke seçin"
        >
          <option value="">Ülke</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Şehir */}
        <select
          value={selectedCity}
          onChange={(e) => {
            setSelectedCity(e.target.value);
            setSelectedDistrict("");
          }}
          className={selectClass}
          disabled={!selectedCountry}
          aria-label="Şehir seçin"
        >
          <option value="">Şehir</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* İlçe */}
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className={selectClass}
          disabled={!selectedCity}
          aria-label="İlçe seçin"
        >
          <option value="">İlçe</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

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
        </select>
      </div>
    </div>
  );
}
