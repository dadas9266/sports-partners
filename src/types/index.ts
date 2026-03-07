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
  status?: "SCHEDULED" | "ONGOING" | "COMPLETED" | "DISPUTED";
  ratings?: { id: string; ratedById: string }[];
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
  // Fiyat bilgisi (EQUIPMENT ve TRAINER ilanları için)
  equipmentDetail?: { price: number; isSold: boolean } | null;
  trainerProfile?: { hourlyRate?: number | null } | null;
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
  // Eğitmen ilanı için ek bilgiler
  trainerProfile?: {
    id: string;
    hourlyRate?: number | null;
    gymName?: string | null;
    gymAddress?: string | null;
    isVerified: boolean;
    specializations: {
      id: string;
      sportName: string;
      years: number;
    }[];
  } | null;
  // Spor malzemesi ilanı için ek bilgiler
  equipmentDetail?: {
    id: string;
    price: number;
    condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
    brand?: string | null;
    model?: string | null;
    images: string[];
    isSold: boolean;
  } | null;
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
    cityId?: string | null;
    districtId?: string | null;
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
  isUrgent: boolean;
  isAnonymous: boolean;
  expiresAt: string;
  isRecurring: boolean;
  recurringDays: string[];  // ["MON","WED","FRI"]
  minAge: number | null;
  maxAge: number | null;
  groupId: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface TrainerSportExperience {
  sportId: string;
  sportName: string;
  years: number;
  certUrl?: string; // Her spor dalı için ayrı sertifika
}

export interface VenueFacilityInput {
  sportId: string;
  sportName: string;
  facilityType: string | null; // "saha" | "kort" | "havuz" | "ring" | "salon" | "pist" | null
  count: number;
  notes?: string; // Açık alan sporları için serbest metin (Hiking, Koşu vb.)
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
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitterX?: string;
  vk?: string;
}

// --- Notification Types ---
export type NotificationType =
  | "NEW_RESPONSE"
  | "RESPONSE_ACCEPTED"
  | "RESPONSE_REJECTED"
  | "NEW_MATCH"
  | "NEW_RATING"
  | "NEW_FOLLOWER"
  | "FOLLOW_REQUEST"
  | "FOLLOW_ACCEPTED"
  | "NEW_MESSAGE"
  | "NO_SHOW_WARNING"
  | "NEW_POST_LIKE"
  | "NEW_POST_COMMENT"
  | "TRAINER_VERIFIED"
  | "MATCH_STATUS_CHANGED"
  | "STREAK_MILESTONE"
  | "LEVEL_UP"
  | "MATCH_OTP_REQUESTED"
  | "VENUE_VERIFIED"
  | "DIRECT_CHALLENGE"
  | "COMMUNITY_JOIN_REQUEST"
  | "COMMUNITY_UPDATE"
  | "TOURNAMENT_INVITE"
  | "TOURNAMENT_RESULT"
  | "USER_REPORT"
  | "URGENT_LISTING_NEARBY"
  | "MATCH_REVEAL";

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
  matchId?: string | null;
  conversationId?: string | null;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: UserPublic & { avatarUrl?: string | null };
}

export interface Conversation {
  type: "match" | "direct";
  id: string;
  matchId?: string | null;
  conversationId?: string | null;
  partner: UserPublic & { avatarUrl?: string | null };
  listing: { id: string; sport: Sport; dateTime: string } | null;
  lastMessage: { content: string; createdAt: string; isMine: boolean } | null;
  hasUnread: boolean;
  updatedAt: string;
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
  totalPoints: number;
  currentStreak: number;
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
  followersCount: number;
  followingCount: number;
  activeListings: ListingSummary[];
  isOwnProfile: boolean;
  birthDate?: string | null;
  gender?: Gender | null;
  whoCanMessage?: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  whoCanChallenge?: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  isBlockedByThem?: boolean;
  isPrivateProfile?: boolean;
  isRestricted?: boolean;
  isPrivateContent?: boolean;
  pendingFollow?: boolean;
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
  clubs: {
    id: string;
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    sport?: { name: string; icon: string } | null;
    city?: { name: string } | null;
    _count: { members: number };
  }[];
  groups: {
    id: string;
    name: string;
    description?: string | null;
    sport?: { name: string; icon: string } | null;
    city?: { name: string } | null;
    _count: { members: number };
  }[];
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

// =============================================
// Story / Hikaye Tipleri
// =============================================

export type StoryType = "MEDIA" | "MATCH" | "RESULT" | "ACHIEVEMENT";

export interface Story {
  id: string;
  userId: string;
  type: StoryType;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  caption: string | null;
  linkedListingId: string | null;
  linkedMatchId: string | null;
  linkedMatchResult: string | null;
  linkedBadgeKey: string | null;
  expiresAt: string;
  createdAt: string;
  // İlişkiler (API'den populate edilir)
  user?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  _count?: {
    views: number;
  };
  viewedByMe?: boolean; // mevcut kullanıcı izledi mi?
}

export interface StoryWithUser extends Story {
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

// Kullanıcıya ait hikaye grubu (profil sayfasında dairesel bubbles için)
export interface UserStoryGroup {
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  stories: Story[];
  hasUnread: boolean; // kullanıcının görmediği hikaye var mı?
}

export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  coverUrl: string | null;
  order: number;
  createdAt: string;
  items?: Array<{
    id: string;
    storyId: string;
    story: Story;
    addedAt: string;
  }>;
}
