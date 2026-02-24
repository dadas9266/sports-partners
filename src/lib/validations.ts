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
export const createListingSchema = z.object({
  type: z.enum(["RIVAL", "PARTNER"], { message: "İlan tipi seçiniz" }),
  sportId: z.string().min(1, "Spor dalı seçiniz"),
  districtId: z.string().min(1, "İlçe seçiniz"),
  venueId: z.string().optional().nullable(),
  dateTime: z
    .string()
    .min(1, "Tarih ve saat seçiniz")
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date > new Date();
      },
      "Tarih gelecekte olmalıdır"
    ),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
    message: "Seviye seçiniz",
  }),
  description: z.string().max(1000, "Açıklama en fazla 1000 karakter olabilir").optional(),
  maxParticipants: z.number().int().min(2).max(20).optional().default(2),
  allowedGender: z.enum(["ANY", "FEMALE_ONLY", "MALE_ONLY"]).optional().default("ANY"),
  isQuick: z.boolean().optional().default(false),
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
});

export const updateListingSchema = z.object({
  type: z.enum(["RIVAL", "PARTNER"], { message: "İlan tipi seçiniz" }).optional(),
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
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  type: z.enum(["RIVAL", "PARTNER"]).optional(),
  upcoming: z.string().optional(),
  quickOnly: z.string().optional(),  // "true" for hızlı ilan filter
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
    sportIds: z.array(z.string()).max(5, "En fazla 5 spor seçebilirsiniz").optional(),
    avatarUrl: z.string().url("Geçerli bir URL giriniz").optional().nullable(),
    gender: z.enum(["MALE", "FEMALE", "PREFER_NOT_TO_SAY"]).optional().nullable(),
    birthDate: z.string().optional().nullable(),
    preferredTime: z.enum(["morning", "evening", "anytime"]).optional().nullable(),
    preferredStyle: z.enum(["competitive", "casual", "both"]).optional().nullable(),
    onboardingDone: z.boolean().optional(),
    currentPassword: z.string().optional(),
    newPassword: passwordSchema.optional(),
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
