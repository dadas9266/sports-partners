import { z } from "zod";

// ========== ŞİFRE POLİTİKASI ==========
// En az 8 karakter, büyük harf, küçük harf, rakam, özel karakter
const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı")
  .regex(/[A-Z]/, "Şifre en az bir büyük harf içermeli")
  .regex(/[a-z]/, "Şifre en az bir küçük harf içermeli")
  .regex(/[0-9]/, "Şifre en az bir rakam içermeli")
  .regex(/[^A-Za-z0-9]/, "Şifre en az bir özel karakter içermeli (!@#$%^&*)");

// ========== AUTH ==========
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "İsim en az 2 karakter olmalı")
    .max(100, "İsim en fazla 100 karakter olabilir")
    .regex(/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/, "İsim sadece harf ve boşluk içerebilir"),
  email: z.string().email("Geçerli bir e-posta giriniz").max(255, "E-posta çok uzun"),
  password: passwordSchema,
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+90|0)?[0-9]{10}$/.test(val.replace(/\s/g, "")),
      "Geçerli bir telefon numarası giriniz (ör: 05551234567)"
    ),
  gender: z.enum(["MALE", "FEMALE", "PREFER_NOT_TO_SAY"], { message: "Lütfen cinsiyet seçiniz" }),
  birthDate: z.string().min(1, "Doğum tarihi gereklidir"),
  cityId: z.string().min(1, "Lütfen şehir seçiniz"),
  districtId: z.string().min(1, "Lütfen ilçe seçiniz"),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(1, "Şifre gerekli"),
});

// ========== LISTING ==========
export const createListingSchema = z
  .object({
  type: z.enum(["RIVAL", "PARTNER", "TRAINER", "EQUIPMENT", "VENUE_RENTAL", "VENUE_MEMBERSHIP", "VENUE_CLASS", "VENUE_PRODUCT", "VENUE_EVENT", "VENUE_SERVICE"], { message: "İlan tipi seçiniz" }),
  sportId: z.string().min(1, "Spor dalı seçiniz"),
  countryId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  venueId: z.string().optional().nullable(),
  // dateTime: RIVAL ve PARTNER için zorunlu ve gelecekte olmalı; TRAINER opsiyonel; EQUIPMENT gerekmez
  dateTime: z.string().optional().nullable(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  description: z.string().max(1000, "Açıklama en fazla 1000 karakter olabilir").optional(),
  maxParticipants: z.number().int().min(2).max(20).optional().default(2),
  allowedGender: z.enum(["ANY", "FEMALE_ONLY", "MALE_ONLY"]).optional().default("ANY"),
  isQuick: z.boolean().optional().default(false),
  isUrgent: z.boolean().optional().default(false),
  isAnonymous: z.boolean().optional().default(false),
  expiresAt: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || !isNaN(new Date(val).getTime()),
      "Geçerli bir bitiş zamanı giriniz"
    ),
  isRecurring: z.boolean().optional().default(false),
  recurringDays: z.array(z.enum(["MON","TUE","WED","THU","FRI","SAT","SUN"])).optional().default([]),
  minAge: z.number().int().min(10).max(99).optional().nullable(),
  maxAge: z.number().int().min(10).max(99).optional().nullable(),
  groupId: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  // Eğitmen ilanı için ek alanlar
  trainerProfile: z.object({
    hourlyRate: z.number().min(0).optional(),
    experience: z.number().int().min(0).optional(),
    specialization: z.string().max(200).optional(),
    gymName: z.string().max(200).optional(),
    gymAddress: z.string().max(500).optional(),
  }).optional(),
  // Spor malzemesi ilanı için ek alanlar
  equipmentDetail: z.object({
    price: z.number().min(0).optional(),
    condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]).optional(),
    brand: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    images: z.array(z.string()).optional().default([]),
  }).optional(),
  // İşletme ilanı için ek alanlar
  venueRentalDetail: z.object({
    facilityType: z.string().max(50).optional(),
    courtCount: z.number().int().min(1).optional(),
    pricePerHour: z.number().min(0).optional(),
    pricePerSession: z.number().min(0).optional(),
    minDuration: z.number().int().min(0).optional(),
    availableSlots: z.string().max(2000).optional(),
    surfaceType: z.string().max(50).optional(),
    hasLighting: z.boolean().optional(),
    images: z.array(z.string()).optional().default([]),
  }).optional(),
  venueMembershipDetail: z.object({
    membershipType: z.string().max(50).optional(),
    price: z.number().min(0).optional(),
    includes: z.array(z.string()).optional().default([]),
    trialAvailable: z.boolean().optional(),
    trialPrice: z.number().min(0).optional(),
    maxMembers: z.number().int().min(0).optional(),
  }).optional(),
  venueClassDetail: z.object({
    className: z.string().max(100).optional(),
    schedule: z.string().max(2000).optional(),
    instructorName: z.string().max(100).optional(),
    pricePerSession: z.number().min(0).optional(),
    priceMonthly: z.number().min(0).optional(),
    difficulty: z.string().max(50).optional(),
    maxParticipants: z.number().int().min(0).optional(),
  }).optional(),
  venueProductDetail: z.object({
    productCategory: z.string().max(50).optional(),
    productName: z.string().max(200).optional(),
    brand: z.string().max(100).optional(),
    price: z.number().min(0).optional(),
    unit: z.string().max(20).optional(),
    inStock: z.boolean().optional(),
    images: z.array(z.string()).optional().default([]),
  }).optional(),
  venueEventDetail: z.object({
    eventType: z.string().max(50).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    entryFee: z.number().min(0).optional(),
    maxParticipants: z.number().int().min(0).optional(),
    registrationDeadline: z.string().optional(),
  }).optional(),
  venueServiceDetail: z.object({
    serviceType: z.string().max(100).optional(),
    sessionDuration: z.number().int().min(0).optional(),
    pricePerSession: z.number().min(0).optional(),
    qualifications: z.string().max(500).optional(),
  }).optional(),
})
.superRefine((data, ctx) => {
  // RIVAL ve PARTNER için tarih zorunlu ve gelecekte olmalı
  if (data.type === "RIVAL" || data.type === "PARTNER") {
    if (!data.dateTime || data.dateTime.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tarih ve saat seçiniz", path: ["dateTime"] });
    } else {
      const date = new Date(data.dateTime);
      if (isNaN(date.getTime()) || date <= new Date()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tarih gelecekte olmalıdır", path: ["dateTime"] });
      }
    }
    // Seviye de zorunlu
    if (!data.level) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Seviye seçiniz", path: ["level"] });
    }
  }
  // TRAINER için tarih seçildiyse gelecekte olmalı (opsiyonel)
  if (data.type === "TRAINER" && data.dateTime && data.dateTime.trim() !== "") {
    const date = new Date(data.dateTime);
    if (isNaN(date.getTime()) || date <= new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tarih gelecekte olmalıdır", path: ["dateTime"] });
    }
  }
  // EQUIPMENT için herhangi bir tarih/seviye validasyonu yapılmaz
  // VENUE_* tipleri için tarih/seviye zorunlu değil (VENUE_EVENT hariç tarih opsiyonel)
  if (data.type === "VENUE_EVENT" && data.venueEventDetail?.startDate) {
    const date = new Date(data.venueEventDetail.startDate);
    if (isNaN(date.getTime()) || date <= new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Etkinlik tarihi gelecekte olmalıdır", path: ["venueEventDetail", "startDate"] });
    }
  }
});

export const updateListingSchema = z.object({
  type: z.enum(["RIVAL", "PARTNER", "TRAINER", "EQUIPMENT", "VENUE_RENTAL", "VENUE_MEMBERSHIP", "VENUE_CLASS", "VENUE_PRODUCT", "VENUE_EVENT", "VENUE_SERVICE"], { message: "İlan tipi seçiniz" }).optional(),
  sportId: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  venueId: z.string().optional().nullable(),
  dateTime: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date > new Date();
      },
      "Tarih gelecekte olmalıdır"
    )
    .optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  allowedGender: z.enum(["ANY", "MALE_ONLY", "FEMALE_ONLY"]).optional(),
  description: z.string().max(1000).optional(),
});

// ========== RESPONSE ==========
export const createResponseSchema = z.object({
  listingId: z.string().min(1, "İlan ID gerekli"),
  message: z.string().max(500, "Mesaj en fazla 500 karakter olabilir").optional(),
});

// ========== FILTER ==========
export const listingFilterSchema = z.object({
  sportId: z.string().optional(),
  districtId: z.string().optional(),
  cityId: z.string().optional(),
  countryId: z.string().optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  radius: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  type: z.enum(["RIVAL", "PARTNER", "TRAINER", "EQUIPMENT", "VENUE_RENTAL", "VENUE_MEMBERSHIP", "VENUE_CLASS", "VENUE_PRODUCT", "VENUE_EVENT", "VENUE_SERVICE"]).optional(),
  userId: z.string().optional(),
  upcoming: z.string().optional(),
  quickOnly: z.string().optional(),  // "true" for hızlı ilan filter
  isRecurring: z.string().optional(), // "true" for recurring listings
  dateFrom: z.string().optional(),    // ISO date string
  dateTo: z.string().optional(),      // ISO date string
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

// ========== PROFİL ==========
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "İsim en az 2 karakter olmalı")
      .max(100, "İsim en fazla 100 karakter olabilir")
      .regex(/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/, "İsim sadece harf ve boşluk içerebilir")
      .optional(),
    phone: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || /^(\+90|0)?[0-9]{10}$/.test(val.replace(/\s/g, "")),
        "Geçerli bir telefon numarası giriniz"
      ),
    bio: z.string().max(300, "Bio en fazla 300 karakter olabilir").optional().nullable(),
    cityId: z.string().optional().nullable(),
    districtId: z.string().optional().nullable(),
    sportIds: z.array(z.string()).max(10, "En fazla 10 spor seçebilirsiniz").optional(),
    avatarUrl: z.string().url("Geçerli bir URL giriniz").optional().nullable(),
    coverUrl: z.string().url("Geçerli bir URL giriniz").optional().nullable(),
    gender: z.enum(["MALE", "FEMALE", "PREFER_NOT_TO_SAY"]).optional().nullable(),
    birthDate: z.string().optional().nullable(),
    preferredTime: z.enum(["morning", "evening", "anytime"]).optional().nullable(),
    preferredStyle: z.enum(["competitive", "casual", "both"]).optional().nullable(),
    onboardingDone: z.boolean().optional(),
    currentPassword: z.string().optional(),
    newPassword: passwordSchema.optional(),
    instagram: z
      .string()
      .max(30)
      .regex(/^[a-zA-Z0-9_.]{1,30}$/, "Instagram kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir (max 30 karakter)")
      .optional()
      .nullable(),
    tiktok: z
      .string()
      .max(24)
      .regex(/^[a-zA-Z0-9_.]{1,24}$/, "TikTok kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir (max 24 karakter)")
      .optional()
      .nullable(),
    facebook: z
      .string()
      .max(50)
      .regex(/^[a-zA-Z0-9.]{1,50}$/, "Facebook kullanıcı adı yalnızca harf, rakam ve nokta içerebilir (max 50 karakter)")
      .optional()
      .nullable(),
    twitterX: z
      .string()
      .max(15)
      .regex(/^[a-zA-Z0-9_]{1,15}$/, "X (Twitter) kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir (max 15 karakter)")
      .optional()
      .nullable(),
    vk: z
      .string()
      .max(32)
      .regex(/^[a-zA-Z0-9_.]{1,32}$/, "VK kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir (max 32 karakter)")
      .optional()
      .nullable(),
    telegram: z
      .string()
      .max(32)
      .regex(/^[a-zA-Z0-9_]{5,32}$/, "Telegram kullanıcı adı 5-32 karakter, harf, rakam ve alt çizgi içerebilir")
      .optional()
      .nullable(),
    whatsapp: z
      .string()
      .max(20)
      .regex(/^\+?[0-9]{7,15}$/, "WhatsApp numarası uluslararası formatta olmalı (ör: +905551234567)")
      .optional()
      .nullable(),
    socialLinksVisibility: z.enum(["EVERYONE", "FOLLOWERS", "NOBODY"]).optional(),
    trainerUniversity: z.string().max(120).optional().nullable(),
    trainerDepartment: z.string().max(120).optional().nullable(),
    trainerGymName: z.string().max(120).optional().nullable(),
    trainerExperienceYears: z.number().int().min(0).max(80).optional().nullable(),
    trainerLessonTypes: z.array(z.enum(["birebir", "grup", "cocuk", "performans"])).max(4).optional(),
    trainerProvidesEquipment: z.boolean().optional().nullable(),
    trainerCertNote: z.string().max(500).optional().nullable(),
    trainerSpecializations: z
      .array(
        z.object({
          sportName: z.string().min(2).max(80),
          years: z.number().int().min(0).max(80),
        })
      )
      .max(10)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    {
      message: "Yeni şifre belirlemek için mevcut şifrenizi girmelisiniz",
      path: ["currentPassword"],
    }
  );

// ========== TYPE EXPORTS ==========
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type CreateResponseInput = z.infer<typeof createResponseSchema>;
export type ListingFilterInput = z.infer<typeof listingFilterSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
