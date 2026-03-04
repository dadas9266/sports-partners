"use client";

import { useMemo } from "react";
import { useLocations } from "@/hooks/useLocations";

interface LocationSelectorProps {
  countryId: string;
  cityId: string;
  districtId: string;
  onChange: (updates: { countryId?: string; cityId?: string; districtId?: string }) => void;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
  selectClass?: string;
  error?: {
    country?: string;
    city?: string;
    district?: string;
  };
}

export default function LocationSelector({
  countryId,
  cityId,
  districtId,
  onChange,
  disabled = false,
  className = "grid grid-cols-1 md:grid-cols-3 gap-4",
  showLabels = true,
  selectClass: customSelectClass,
  error,
}: LocationSelectorProps) {
  const { locations, loading } = useLocations();

  const countries = locations || [];
  
  const cities = useMemo(() => {
    return countries.find((c) => c.id === countryId)?.cities || [];
  }, [countries, countryId]);

  const districts = useMemo(() => {
    return cities.find((c) => c.id === cityId)?.districts || [];
  }, [cities, cityId]);

  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const selectClass = customSelectClass || "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition disabled:opacity-50";
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <div className={className}>
      {/* Ülke Seçimi */}
      <div>
        {showLabels && <label className={labelClass}>Ülke</label>}
        <select
          value={countryId}
          onChange={(e) => onChange({ countryId: e.target.value, cityId: "", districtId: "" })}
          disabled={disabled || loading}
          className={`${selectClass} ${error?.country ? "border-red-500" : ""}`}
        >
          <option value="">{showLabels ? "Ülke Seçiniz" : "Ülke"}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {error?.country && <p className={errorClass}>{error.country}</p>}
      </div>

      {/* Şehir Seçimi */}
      <div>
        {showLabels && <label className={labelClass}>Şehir <span className="font-normal text-xs text-gray-400">(opsiyonel)</span></label>}
        <select
          value={cityId}
          onChange={(e) => onChange({ cityId: e.target.value, districtId: "" })}
          disabled={disabled || loading || !countryId}
          className={`${selectClass} ${error?.city ? "border-red-500" : ""}`}
        >
          <option value="">{showLabels ? "Şehir Seçiniz" : "Şehir"}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {error?.city && <p className={errorClass}>{error.city}</p>}
      </div>

      {/* İlçe Seçimi — şehirde ilçe verisi varsa göster */}
      {districts.length > 0 && (
      <div>
        {showLabels && <label className={labelClass}>İlçe <span className="text-gray-400 font-normal text-xs">(opsiyonel)</span></label>}
        <select
          value={districtId}
          onChange={(e) => onChange({ districtId: e.target.value })}
          disabled={disabled || loading || !cityId}
          className={`${selectClass} ${error?.district ? "border-red-500" : ""}`}
        >
          <option value="">{showLabels ? "İlçe Seçiniz (opsiyonel)" : "İlçe"}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {error?.district && <p className={errorClass}>{error.district}</p>}
      </div>
      )}
    </div>
  );
}
