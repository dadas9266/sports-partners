import { useCallback, useEffect, useState } from "react";
import { getListings } from "@/services/api";
import type { ListingSummary } from "@/types";

interface PaginationState {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UseListingsReturn {
  listings: ListingSummary[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  fetchWithFilters: (filters: Record<string, string>) => void;
  goToPage: (page: number) => void;
  currentFilters: Record<string, string>;
}

export function useListings(initialPageSize = 12): UseListingsReturn {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    pageSize: initialPageSize,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchListings = useCallback(
    async (filters: Record<string, string> = {}, page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getListings(filters, page, initialPageSize);
        if (data.success) {
          setListings(data.data);
          setPagination(data.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "İlanlar yüklenemedi");
        setListings([]);
      } finally {
        setLoading(false);
      }
    },
    [initialPageSize]
  );

  const fetchWithFilters = useCallback(
    (filters: Record<string, string>) => {
      setCurrentFilters(filters);
      fetchListings(filters, 1);
    },
    [fetchListings]
  );

  const goToPage = useCallback(
    (page: number) => {
      fetchListings(currentFilters, page);
    },
    [currentFilters, fetchListings]
  );

  return { listings, loading, error, pagination, fetchWithFilters, goToPage, currentFilters };
}
