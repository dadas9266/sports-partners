"use client";

import { useState } from "react";
import type { Badge } from "@/types";

export default function BadgeChip({ badge }: { badge: Badge }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`${badge.label}: ${badge.description}`}
      >
        {badge.icon} {badge.label}
      </button>
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none animate-fade-in">
          {badge.description}
        </span>
      )}
    </span>
  );
}
