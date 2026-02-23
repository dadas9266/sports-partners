import { describe, it, expect } from "vitest";
import {
  LEVEL_LABELS,
  LEVEL_LABELS_WITH_ICON,
  LEVEL_COLORS,
  STATUS_LABELS,
} from "@/types";

describe("LEVEL_LABELS", () => {
  it("should have all three levels", () => {
    expect(Object.keys(LEVEL_LABELS)).toHaveLength(3);
    expect(LEVEL_LABELS.BEGINNER).toBeDefined();
    expect(LEVEL_LABELS.INTERMEDIATE).toBeDefined();
    expect(LEVEL_LABELS.ADVANCED).toBeDefined();
  });

  it("should have Turkish labels", () => {
    expect(LEVEL_LABELS.BEGINNER).toBe("Başlangıç");
    expect(LEVEL_LABELS.INTERMEDIATE).toBe("Orta");
    expect(LEVEL_LABELS.ADVANCED).toBe("İleri");
  });
});

describe("LEVEL_LABELS_WITH_ICON", () => {
  it("should contain emoji icons", () => {
    expect(LEVEL_LABELS_WITH_ICON.BEGINNER).toContain("🌱");
    expect(LEVEL_LABELS_WITH_ICON.INTERMEDIATE).toContain("🔥");
    expect(LEVEL_LABELS_WITH_ICON.ADVANCED).toContain("⚡");
  });
});

describe("LEVEL_COLORS", () => {
  it("should have CSS class strings for all levels", () => {
    expect(LEVEL_COLORS.BEGINNER).toContain("bg-blue-100");
    expect(LEVEL_COLORS.INTERMEDIATE).toContain("bg-yellow-100");
    expect(LEVEL_COLORS.ADVANCED).toContain("bg-red-100");
  });

  it("should include dark mode classes", () => {
    Object.values(LEVEL_COLORS).forEach((value) => {
      expect(value).toContain("dark:");
    });
  });
});

describe("STATUS_LABELS", () => {
  it("should have all status types", () => {
    const expectedStatuses = ["OPEN", "CLOSED", "MATCHED", "PENDING", "ACCEPTED", "REJECTED"];
    expectedStatuses.forEach((status) => {
      expect(STATUS_LABELS[status]).toBeDefined();
      expect(STATUS_LABELS[status].label).toBeTruthy();
      expect(STATUS_LABELS[status].className).toBeTruthy();
    });
  });

  it("should have correct Turkish labels", () => {
    expect(STATUS_LABELS.OPEN.label).toBe("Açık");
    expect(STATUS_LABELS.CLOSED.label).toBe("Kapatıldı");
    expect(STATUS_LABELS.MATCHED.label).toBe("Eşleşti");
    expect(STATUS_LABELS.PENDING.label).toBe("Bekliyor");
    expect(STATUS_LABELS.ACCEPTED.label).toBe("Kabul Edildi");
    expect(STATUS_LABELS.REJECTED.label).toBe("Reddedildi");
  });
});
