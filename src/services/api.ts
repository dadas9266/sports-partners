import type {
  ApiResponse,
  PaginatedResponse,
  ListingSummary,
  ListingDetail,
  Sport,
  Country,
  Venue,
  ProfileData,
  Notification,
  Rating,
  PublicProfile,
  SearchResults,
  Conversation,
  Message,
  LeaderboardEntry,
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
  maxParticipants?: number;
  allowedGender?: string;
  isQuick?: boolean;
  expiresAt?: string;
  isRecurring?: boolean;
  recurringDays?: string[];
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
  bio?: string | null;
  cityId?: string | null;
  sportIds?: string[];
  avatarUrl?: string | null;
  gender?: string | null;
  preferredTime?: string | null;
  preferredStyle?: string | null;
  onboardingDone?: boolean;
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
  gender?: string;
}): Promise<ApiResponse<{ id: string; name: string; email: string }>> {
  return fetchAPI("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ========== PUBLIC PROFILE ==========
export async function getPublicProfile(userId: string): Promise<ApiResponse<PublicProfile>> {
  return fetchAPI(`/api/users/${userId}`);
}

// ========== NOTIFICATIONS ==========
export async function getNotifications(unreadOnly = false): Promise<ApiResponse<Notification[]> & { unreadCount: number }> {
  return fetchAPI(`/api/notifications${unreadOnly ? "?unread=true" : ""}`);
}

export async function markNotificationsRead(ids?: string[]): Promise<ApiResponse<null>> {
  return fetchAPI("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(ids ? { ids } : { all: true }),
  });
}

// ========== FAVİRİLER ==========
export async function getFavorites(): Promise<ApiResponse<ListingSummary[]>> {
  return fetchAPI("/api/favorites");
}

export async function toggleFavorite(listingId: string): Promise<ApiResponse<{ favorited: boolean }>> {
  return fetchAPI("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ listingId }),
  });
}

// ========== DEĞERLENDİRME ==========
export async function submitRating(
  matchId: string,
  score: number,
  comment?: string
): Promise<ApiResponse<unknown>> {
  return fetchAPI("/api/ratings", {
    method: "POST",
    body: JSON.stringify({ matchId, score, comment }),
  });
}

export async function getUserRatings(userId: string): Promise<ApiResponse<Rating[]> & { avgRating: number | null }> {
  return fetchAPI(`/api/ratings?userId=${userId}`);
}

// ========== ARAMA ==========
export async function searchAll(q: string): Promise<ApiResponse<SearchResults>> {
  return fetchAPI(`/api/search?q=${encodeURIComponent(q)}`);
}

// ========== SOSYAL (TAKIP) ==========
export async function toggleFollow(userId: string): Promise<ApiResponse<{ following: boolean }>> {
  return fetchAPI(`/api/users/${userId}/follow`, { method: "POST" });
}

export async function getFollowStats(userId: string): Promise<ApiResponse<{ followerCount: number; followingCount: number; isFollowing: boolean }>> {
  return fetchAPI(`/api/users/${userId}/follow`);
}

// ========== AKIŞ (FEED) ==========
export async function getFeed(page = 1): Promise<PaginatedResponse<ListingSummary>> {
  return fetchAPI(`/api/feed?page=${page}&pageSize=12`);
}

// ========== LİDERLİK TABLOSU ==========
export async function getLeaderboard(sportId?: string, limit = 20): Promise<ApiResponse<LeaderboardEntry[]>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sportId) params.set("sport", sportId);
  return fetchAPI(`/api/leaderboard?${params.toString()}`);
}

// ========== MESAJLAR ==========
export async function getConversations(): Promise<ApiResponse<Conversation[]>> {
  return fetchAPI("/api/messages");
}

export async function getMessages(
  matchId: string,
  cursor?: string
): Promise<ApiResponse<{ messages: Message[]; nextCursor: string | null }>> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return fetchAPI(`/api/messages/${matchId}?${params.toString()}`);
}

export async function sendMessage(
  matchId: string,
  content: string
): Promise<ApiResponse<Message>> {
  return fetchAPI(`/api/messages/${matchId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// ========== RECOMMENDATIONS ==========
export async function getRecommendations(limit = 6): Promise<ApiResponse<ListingSummary[]> & { reason: string }> {
  return fetchAPI(`/api/recommendations?limit=${limit}`);
}

// ========== NO-SHOW ==========
export async function reportNoShow(matchId: string): Promise<ApiResponse<{ noShowCount: number }>> {
  return fetchAPI(`/api/matches/${matchId}/no-show`, {
    method: "POST",
  });
}
