// =============================================
// Merkezi Tip Tanımları
// =============================================

// --- Enum Types ---
export type ListingType = "RIVAL" | "PARTNER" | "TRAINER" | "EQUIPMENT";
export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ListingStatus = "OPEN" | "CLOSED" | "MATCHED" | "EXPIRED";
export type ResponseStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type Gender = "MALE" | "FEMALE" | "PREFER_NOT_TO_SAY";
export type AllowedGender = "ANY" | "FEMALE_ONLY" | "MALE_ONLY";

// --- Entity Types ---
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  gender?: Gender | null;
  noShowCount?: number;
  warnCount?: number;
  isBanned?: boolean;
  preferredTime?: string | null;
  preferredStyle?: string | null;
  onboardingDone?: boolean;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  name: string;
  avatarUrl?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
}

export interface UserContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface Sport {
  id: string;
  name: string;
  icon: string | null;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  cities: City[];
}

export interface City {
  id: string;
  name: string;
  countryId: string;
  country?: Country;
  districts: District[];
}

export interface District {
  id: string;
  name: string;
  cityId: string;
  city?: City;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  districtId: string;
}

export interface ListingResponse {
  id: string;
  listingId: string;
  userId: string;
  user: UserPublic;
  message?: string | null;
  status: ResponseStatus;
  createdAt: string;
}

export interface Match {
  id: string;
  listingId: string;
  responseId: string;
  user1Id: string;
  user2Id: string;
  user1: UserContact;
  user2: UserContact;
  createdAt: string;
  listing?: ListingSummary;
}

export interface ListingSummary {
  id: string;
  type: ListingType;
  sport: Sport;
  district: District & { city: City };
  venue?: Venue | null;
  user: UserPublic;
  dateTime: string;
  level: Level;
  status: ListingStatus;
  description?: string | null;
  maxParticipants: number;
  allowedGender: AllowedGender;
  isQuick: boolean;
  expiresAt?: string | null;
  _count: { responses: number };
  // Feed extras
  isFromFollowing?: boolean;
  isGroup?: boolean;
  // Uyumluluk skoru (0-100)
  compatibilityScore?: number;
}

export interface ListingDetail {
  id: string;
  type: ListingType;
  sport: Sport;
  district: District & { city: City & { country: Country } };
  venue?: Venue | null;
  userId: string;
  user: UserPublic;
  dateTime: string;
  level: Level;
  status: ListingStatus;
  description?: string | null;
  maxParticipants: number;
  allowedGender: AllowedGender;
  isQuick: boolean;
  expiresAt?: string | null;
  responses: ListingResponse[];
  match?: Match | null;
  createdAt: string;
}

// --- API Response Types ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// --- Profile Types ---
export interface ProfileData {
  user: User & {
    bio?: string | null;
    avatarUrl?: string | null;
    city?: { id: string; name: string; country?: { name: string } } | null;
    sports: Sport[];
    avgRating?: number | null;
    ratingCount?: number;
  };
  myListings: ListingWithResponses[];
  myResponses: ResponseWithListing[];
  myMatches: Match[];
  myFavorites: ListingSummary[];
  unreadNotifications: number;
}

export interface ListingWithResponses {
  id: string;
  type: ListingType;
  sport: Sport;
  district: District & { city: City };
  venue?: Venue | null;
  dateTime: string;
  level: Level;
  status: ListingStatus;
  description?: string | null;
  responses: ListingResponse[];
  match?: {
    user2: UserContact;
  } | null;
}

export interface ResponseWithListing {
  id: string;
  listingId: string;
  message?: string | null;
  status: ResponseStatus;
  createdAt: string;
  listing: {
    sport: Sport;
    user: UserPublic;
  };
}

// --- Form Types ---
export interface CreateListingForm {
  type: ListingType | "";
  sportId: string;
  countryId: string;
  cityId: string;
  districtId: string;
  venueId: string;
  dateTime: string;
  level: Level | "";
  description: string;
  maxParticipants: number;
  allowedGender: AllowedGender;
  isQuick: boolean;
  expiresAt: string;
  isRecurring: boolean;
  recurringDays: string[];  // ["MON","WED","FRI"]
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  gender: Gender | "";
  cityId: string;
  districtId: string;
  birthDate: string;
}

export interface ProfileEditForm {
  name: string;
  phone: string;
  bio: string;
  cityId: string;
  districtId: string;
  gender: string;
  birthDate: string;
  sportIds: string[];
  currentPassword: string;
  newPassword: string;
}

// --- Notification Types ---
export type NotificationType =
  | "NEW_RESPONSE"
  | "RESPONSE_ACCEPTED"
  | "RESPONSE_REJECTED"
  | "NEW_MATCH"
  | "NEW_RATING"
  | "NEW_FOLLOWER"
  | "NEW_MESSAGE"
  | "NO_SHOW_WARNING";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

// --- Social Types ---
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: UserPublic & { avatarUrl?: string | null };
}

export interface Conversation {
  matchId: string;
  partner: UserPublic & { avatarUrl?: string | null };
  listing: { id: string; sport: Sport; dateTime: string };
  lastMessage: { content: string; createdAt: string; isMine: boolean } | null;
  hasUnread: boolean;
}

// --- Gamification Types ---
export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl?: string | null;
  city?: { name: string } | null;
  sports: Sport[];
  avgRating: number;
  ratingCount: number;
  totalMatches: number;
  badges: Badge[];
}

// --- Rating Types ---
export interface Rating {
  id: string;
  matchId: string;
  ratedById: string;
  ratedBy: { id: string; name: string; avatarUrl?: string | null };
  ratedUserId: string;
  score: number;
  comment?: string | null;
  createdAt: string;
}

// --- Public Profile Types ---
export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  city?: { name: string; country?: { name: string } } | null;
  sports: Sport[];
  avgRating?: number | null;
  ratingCount: number;
  totalListings: number;
  totalMatches: number;
  activeListings: ListingSummary[];
  isOwnProfile: boolean;
  birthDate?: string | null;
  gender?: Gender | null;
}

// --- Search Types ---
export interface SearchResults {
  listings: ListingSummary[];
  users: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    bio?: string | null;
    city?: { name: string } | null;
    sports: { name: string; icon: string | null }[];
  }[];
  sports: Sport[];
}

// --- UI Helper Types ---
export const LEVEL_LABELS: Record<Level, string> = {
  BEGINNER: "Başlangıç",
  INTERMEDIATE: "Orta",
  ADVANCED: "İleri",
};

export const LEVEL_LABELS_WITH_ICON: Record<Level, string> = {
  BEGINNER: "🌱 Başlangıç",
  INTERMEDIATE: "🔥 Orta",
  ADVANCED: "⚡ İleri",
};

export const LEVEL_COLORS: Record<Level, string> = {
  BEGINNER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  ADVANCED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Erkek",
  FEMALE: "Kadın",
  PREFER_NOT_TO_SAY: "Belirtmek İstemiyorum",
};

export const ALLOWED_GENDER_LABELS: Record<AllowedGender, string> = {
  ANY: "Herkese Açık",
  FEMALE_ONLY: "Yalnızca Kadınlar",
  MALE_ONLY: "Yalnızca Erkekler",
};

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Açık", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  CLOSED: { label: "Kapatıldı", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  MATCHED: { label: "Eşleşti", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  PENDING: { label: "Bekliyor", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  ACCEPTED: { label: "Kabul Edildi", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  REJECTED: { label: "Reddedildi", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};
