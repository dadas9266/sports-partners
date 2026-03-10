import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    noShowReport: { count: vi.fn() },
    rating: { findMany: vi.fn() },
    match: { count: vi.fn() },
    user: { update: vi.fn() },
  },
}));

import { computeTrustScore, updateTrustScore } from "@/lib/trust-score";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  noShowReport: { count: ReturnType<typeof vi.fn> };
  rating: { findMany: ReturnType<typeof vi.fn> };
  match: { count: ReturnType<typeof vi.fn> };
  user: { update: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

function setupMocks(noShows: number, ratings: { score: number }[], matches: number) {
  mockPrisma.noShowReport.count.mockResolvedValue(noShows);
  mockPrisma.rating.findMany.mockResolvedValue(ratings);
  mockPrisma.match.count.mockResolvedValue(matches);
}

describe("computeTrustScore", () => {
  it("başlangıç skoru 100 (hiç aktivite yok)", async () => {
    setupMocks(0, [], 0);
    expect(await computeTrustScore("u1")).toBe(100);
  });

  it("no-show başına -25 uygular", async () => {
    setupMocks(2, [], 0);
    expect(await computeTrustScore("u1")).toBe(50); // 100 - 2*25
  });

  it("pozitif rating (4-5★) başına +5", async () => {
    setupMocks(0, [{ score: 5 }, { score: 4 }], 0);
    expect(await computeTrustScore("u1")).toBe(110); // 100 + 2*5
  });

  it("negatif rating (1-2★) başına -10", async () => {
    setupMocks(0, [{ score: 1 }, { score: 2 }], 0);
    expect(await computeTrustScore("u1")).toBe(80); // 100 - 2*10
  });

  it("3★ rating nötr (etki yok)", async () => {
    setupMocks(0, [{ score: 3 }], 0);
    expect(await computeTrustScore("u1")).toBe(100);
  });

  it("5+ maç bonusu +10", async () => {
    setupMocks(0, [], 5);
    expect(await computeTrustScore("u1")).toBe(110);
  });

  it("10+ maç bonusu +10 + +20 = +30", async () => {
    setupMocks(0, [], 10);
    expect(await computeTrustScore("u1")).toBe(130); // 100 + 10 + 20
  });

  it("skor minimum 0 altına düşmez", async () => {
    setupMocks(10, [{ score: 1 }, { score: 1 }, { score: 1 }], 0);
    // 100 - 250 - 30 = -180 → clamped 0
    expect(await computeTrustScore("u1")).toBe(0);
  });

  it("skor maksimum 200 üstüne çıkmaz", async () => {
    setupMocks(0, Array(30).fill({ score: 5 }), 15);
    // 100 + 150 + 30 = 280 → clamped 200
    expect(await computeTrustScore("u1")).toBe(200);
  });

  it("karma senaryo: noshow + rating + maç", async () => {
    setupMocks(1, [{ score: 5 }, { score: 1 }], 6);
    // 100 - 25 + 5 - 10 + 10 = 80
    expect(await computeTrustScore("u1")).toBe(80);
  });
});

describe("updateTrustScore", () => {
  it("skoru hesaplar ve user.totalPoints günceller", async () => {
    setupMocks(0, [], 0);
    mockPrisma.user.update.mockResolvedValue({ totalPoints: 100 });

    const score = await updateTrustScore("u1");
    expect(score).toBe(100);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { totalPoints: 100 },
    });
  });
});
