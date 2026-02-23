import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  createListingSchema,
  createResponseSchema,
  listingFilterSchema,
  updateProfileSchema,
} from "@/lib/validations";

// ========== REGISTER SCHEMA ==========
describe("registerSchema", () => {
  const validData = {
    name: "Ahmet Yılmaz",
    email: "ahmet@test.com",
    password: "Test123!",
  };

  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept registration with optional phone", () => {
    const result = registerSchema.safeParse({
      ...validData,
      phone: "05551234567",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short name", () => {
    const result = registerSchema.safeParse({ ...validData, name: "A" });
    expect(result.success).toBe(false);
  });

  it("should reject name with numbers", () => {
    const result = registerSchema.safeParse({ ...validData, name: "Ahmet123" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = registerSchema.safeParse({ ...validData, email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("should reject short password", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Ab1!" });
    expect(result.success).toBe(false);
  });

  it("should reject password without uppercase", () => {
    const result = registerSchema.safeParse({ ...validData, password: "test1234!" });
    expect(result.success).toBe(false);
  });

  it("should reject password without lowercase", () => {
    const result = registerSchema.safeParse({ ...validData, password: "TEST1234!" });
    expect(result.success).toBe(false);
  });

  it("should reject password without digit", () => {
    const result = registerSchema.safeParse({ ...validData, password: "TestTest!" });
    expect(result.success).toBe(false);
  });

  it("should reject password without special char", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Test1234" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid phone number", () => {
    const result = registerSchema.safeParse({ ...validData, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("should accept Turkish characters in name", () => {
    const result = registerSchema.safeParse({ ...validData, name: "Şükrü Çağlar" });
    expect(result.success).toBe(true);
  });
});

// ========== LOGIN SCHEMA ==========
describe("loginSchema", () => {
  it("should accept valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@test.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "test",
    });
    expect(result.success).toBe(false);
  });
});

// ========== CREATE LISTING SCHEMA ==========
describe("createListingSchema", () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const validListing = {
    type: "RIVAL" as const,
    sportId: "sport123",
    districtId: "district123",
    dateTime: futureDate,
    level: "BEGINNER" as const,
  };

  it("should accept valid listing data", () => {
    const result = createListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("should accept listing with optional description", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      description: "Halı saha maçı",
    });
    expect(result.success).toBe(true);
  });

  it("should reject past date", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      dateTime: "2020-01-01T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid type", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid level", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      level: "EXPERT",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty sportId", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      sportId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description over 1000 chars", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ========== CREATE RESPONSE SCHEMA ==========
describe("createResponseSchema", () => {
  it("should accept valid response", () => {
    const result = createResponseSchema.safeParse({
      listingId: "listing123",
      message: "Katılmak istiyorum!",
    });
    expect(result.success).toBe(true);
  });

  it("should accept response without message", () => {
    const result = createResponseSchema.safeParse({
      listingId: "listing123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty listingId", () => {
    const result = createResponseSchema.safeParse({
      listingId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject message over 500 chars", () => {
    const result = createResponseSchema.safeParse({
      listingId: "listing123",
      message: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ========== LISTING FILTER SCHEMA ==========
describe("listingFilterSchema", () => {
  it("should accept empty filter (defaults)", () => {
    const result = listingFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(12);
    }
  });

  it("should accept valid filters", () => {
    const result = listingFilterSchema.safeParse({
      sportId: "sport1",
      level: "ADVANCED",
      type: "RIVAL",
      page: 2,
      pageSize: 24,
    });
    expect(result.success).toBe(true);
  });

  it("should coerce string page to number", () => {
    const result = listingFilterSchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("should reject pageSize over 50", () => {
    const result = listingFilterSchema.safeParse({ pageSize: 100 });
    expect(result.success).toBe(false);
  });

  it("should reject page 0", () => {
    const result = listingFilterSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });
});

// ========== UPDATE PROFILE SCHEMA ==========
describe("updateProfileSchema", () => {
  it("should accept valid profile update", () => {
    const result = updateProfileSchema.safeParse({
      name: "Yeni İsim",
    });
    expect(result.success).toBe(true);
  });

  it("should require currentPassword when newPassword is set", () => {
    const result = updateProfileSchema.safeParse({
      newPassword: "NewPass123!",
    });
    expect(result.success).toBe(false);
  });

  it("should accept password change with current password", () => {
    const result = updateProfileSchema.safeParse({
      currentPassword: "OldPass123!",
      newPassword: "NewPass123!",
    });
    expect(result.success).toBe(true);
  });

  it("should accept phone update", () => {
    const result = updateProfileSchema.safeParse({
      phone: "05559876543",
    });
    expect(result.success).toBe(true);
  });
});
