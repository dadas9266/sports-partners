import type {
  ApiResponse,
  PaginatedResponse,
  ListingSummary,
  ListingDetail,
  Sport,
  Country,
  Venue,
  ProfileData,
} from "@/types";

const BASE_URL = "";

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new APIError(data.error || "Bir hata oluştu", res.status);
  }

  return data;
}

export class APIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

// ========== LISTINGS ==========
export async function getListings(
  filters: Record<string, string> = {},
  page = 1,
  pageSize = 12
): Promise<PaginatedResponse<ListingSummary>> {
  const params = new URLSearchParams({ ...filters, page: String(page), pageSize: String(pageSize) });
  return fetchAPI(`/api/listings?${params.toString()}`);
}

export async function getListingDetail(id: string): Promise<ApiResponse<ListingDetail>> {
  return fetchAPI(`/api/listings/${id}`);
}

export async function createListing(data: {
  type: string;
  sportId: string;
  districtId: string;
  venueId?: string | null;
  dateTime: string;
  level: string;
  description?: string;
}): Promise<ApiResponse<ListingDetail>> {
  return fetchAPI("/api/listings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateListing(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<ListingDetail>> {
  return fetchAPI(`/api/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function closeListing(id: string): Promise<ApiResponse<null>> {
  return fetchAPI(`/api/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "close" }),
  });
}

export async function deleteListing(id: string): Promise<ApiResponse<null>> {
  return fetchAPI(`/api/listings/${id}`, { method: "DELETE" });
}

// ========== RESPONSES ==========
export async function sendResponse(
  listingId: string,
  message?: string
): Promise<ApiResponse<unknown>> {
  return fetchAPI("/api/responses", {
    method: "POST",
    body: JSON.stringify({ listingId, message }),
  });
}

export async function handleResponse(
  responseId: string,
  action: "accept" | "reject"
): Promise<ApiResponse<unknown>> {
  return fetchAPI(`/api/responses/${responseId}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

// ========== SPORTS & LOCATIONS ==========
export async function getSports(): Promise<ApiResponse<Sport[]>> {
  return fetchAPI("/api/sports");
}

export async function getLocations(): Promise<ApiResponse<Country[]>> {
  return fetchAPI("/api/locations");
}

export async function getVenues(districtId: string): Promise<ApiResponse<Venue[]>> {
  return fetchAPI(`/api/venues?districtId=${districtId}`);
}

// ========== PROFILE ==========
export async function getProfile(): Promise<ApiResponse<ProfileData>> {
  return fetchAPI("/api/profile");
}

export async function updateProfile(data: {
  name?: string;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
}): Promise<ApiResponse<unknown>> {
  return fetchAPI("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ========== AUTH ==========
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<ApiResponse<{ id: string; name: string; email: string }>> {
  return fetchAPI("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
