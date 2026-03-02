/**
 * community-service.ts
 *
 * Centralised data-access layer for the `Community` / `CommunityMembership`
 * Prisma models.  All three API route families under /api/communities/*
 * delegate their database work here so the HTTP handlers stay thin.
 */

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { CommunityType } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Shared Prisma select shape
// ──────────────────────────────────────────────────────────────────────────────

export const communitySelect = {
  id: true,
  type: true,
  name: true,
  description: true,
  avatarUrl: true,
  website: true,
  isPrivate: true,
  createdAt: true,
  sport: { select: { id: true, name: true, icon: true } },
  city: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { members: true } },
} as const;

export const memberSelect = {
  id: true,
  role: true,
  status: true,
  joinedAt: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// List communities
// ──────────────────────────────────────────────────────────────────────────────

export interface ListCommunitiesOptions {
  type?: CommunityType | null;
  cityId?: string;
  sportId?: string;
  search?: string;
  page?: number;
  limit?: number;
  /** When true, returns communities the given userId is a member of. */
  myMembershipUserId?: string;
}

export async function listCommunities(opts: ListCommunitiesOptions) {
  const {
    type,
    cityId,
    sportId,
    search,
    page = 1,
    limit = 20,
    myMembershipUserId,
  } = opts;

  if (myMembershipUserId) {
    const memberships = await prisma.communityMembership.findMany({
      where: { userId: myMembershipUserId },
      select: {
        role: true,
        status: true,
        community: { select: communitySelect },
      },
      orderBy: { joinedAt: "desc" },
    });
    const data = memberships.map((m) => ({
      ...m.community,
      role: m.role,
      myStatus: m.status as "APPROVED" | "PENDING" | "REJECTED",
    }));
    return { data, total: data.length, page: 1, limit };
  }

  const where = {
    ...(type && { type }),
    ...(cityId && { cityId }),
    ...(sportId && { sportId }),
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
  };

  const [communities, total] = await Promise.all([
    prisma.community.findMany({
      where,
      select: communitySelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.community.count({ where }),
  ]);

  return { communities, total, page, limit };
}

/** Attach `myStatus` from view-user's membership to a list of communities. */
export async function attachMyStatus<T extends { id: string }>(
  communities: T[],
  userId: string,
): Promise<Array<T & { myStatus: string | null }>> {
  if (communities.length === 0) return communities.map((c) => ({ ...c, myStatus: null }));
  const myMems = await prisma.communityMembership.findMany({
    where: { userId, communityId: { in: communities.map((c) => c.id) } },
    select: { communityId: true, status: true },
  });
  const statusMap = Object.fromEntries(myMems.map((m) => [m.communityId, m.status]));
  return communities.map((c) => ({ ...c, myStatus: statusMap[c.id] ?? null }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Single community CRUD
// ──────────────────────────────────────────────────────────────────────────────

export async function getCommunity(id: string) {
  return prisma.community.findUnique({ where: { id }, select: communitySelect });
}

export interface CreateCommunityInput {
  type: CommunityType;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  isPrivate: boolean;
  sportId?: string | null;
  cityId?: string | null;
  creatorId: string;
}

export async function createCommunity(data: CreateCommunityInput) {
  return prisma.community.create({
    data: {
      type: data.type,
      name: data.name,
      description: data.description ?? null,
      avatarUrl: data.avatarUrl ?? null,
      website: data.website ?? null,
      isPrivate: data.isPrivate,
      sportId: data.sportId ?? null,
      cityId: data.cityId ?? null,
      creatorId: data.creatorId,
      members: { create: { userId: data.creatorId, role: "ADMIN" } },
    },
    select: communitySelect,
  });
}

export interface UpdateCommunityInput {
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  isPrivate?: boolean;
}

/**
 * Returns `null` when the community is not found, `"forbidden"` when the caller
 * is not an ADMIN, or the updated community on success.
 */
export async function updateCommunity(
  id: string,
  input: UpdateCommunityInput,
  callerUserId: string,
): Promise<"notFound" | "forbidden" | ReturnType<typeof getCommunity>> {
  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId: callerUserId, communityId: id } },
    select: { role: true, status: true },
  });
  if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
    return "forbidden";
  }

  const community = await prisma.community.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!community) return "notFound";

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl || null;
  if (input.website !== undefined) patch.website = input.website || null;
  if (input.isPrivate !== undefined) patch.isPrivate = input.isPrivate;

  return prisma.community.update({ where: { id }, data: patch, select: communitySelect });
}

/** Returns `"notFound"` | `"forbidden"` | `"ok"`. */
export async function deleteCommunity(
  id: string,
  callerUserId: string,
): Promise<"notFound" | "forbidden" | "ok"> {
  const community = await prisma.community.findUnique({
    where: { id },
    select: { creatorId: true },
  });
  if (!community) return "notFound";
  if (community.creatorId !== callerUserId) return "forbidden";
  await prisma.community.delete({ where: { id } });
  return "ok";
}

// ──────────────────────────────────────────────────────────────────────────────
// Membership operations
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns members for a community. If the caller is an ADMIN, honours the
 * `status` filter (default `"APPROVED"`). Non-admins always get only APPROVED.
 */
export async function listCommunityMembers(
  communityId: string,
  opts: { callerUserId?: string; statusFilter?: string },
) {
  const { callerUserId, statusFilter = "APPROVED" } = opts;

  let isAdmin = false;
  if (callerUserId) {
    const m = await prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId: callerUserId, communityId } },
      select: { role: true, status: true },
    });
    isAdmin = m?.role === "ADMIN" && m?.status === "APPROVED";
  }

  const effectiveStatus = isAdmin ? statusFilter : "APPROVED";

  return prisma.communityMembership.findMany({
    where: effectiveStatus === "ALL" ? { communityId } : { communityId, status: effectiveStatus },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: memberSelect,
  });
}

export type JoinResult =
  | "notFound"
  | "alreadyMember"
  | "pendingAlready"
  | { status: "APPROVED" | "PENDING" };

/** Create or re-activate a membership. */
export async function joinCommunity(
  communityId: string,
  userId: string,
): Promise<JoinResult> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { isPrivate: true, creatorId: true, name: true },
  });
  if (!community) return "notFound";

  const existing = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });

  const desiredStatus = community.isPrivate ? "PENDING" : "APPROVED";

  if (existing) {
    if (existing.status === "APPROVED") return "alreadyMember";
    if (existing.status === "PENDING") return "pendingAlready";
    // REJECTED — re-apply
    const updated = await prisma.communityMembership.update({
      where: { userId_communityId: { userId, communityId } },
      data: { status: desiredStatus },
    });
    return { status: updated.status as "APPROVED" | "PENDING" };
  }

  const membership = await prisma.communityMembership.create({
    data: { userId, communityId, role: "MEMBER", status: desiredStatus },
  });

  if (community.isPrivate) {
    await createNotification({
      userId: community.creatorId,
      type: "COMMUNITY_JOIN_REQUEST" as Parameters<typeof createNotification>[0]["type"],
      title: "Yeni Üyelik Talebi",
      body: `Topluluk "${community.name}" için yeni üyelik talebi var.`,
      link: `/topluluklar/${communityId}?tab=manage`,
    }).catch(() => {});
  }

  return { status: membership.status as "APPROVED" | "PENDING" };
}

export type LeaveResult = "notFound" | "notMember" | "lastAdmin" | "ok";

/** Remove caller from a community. Guards against stranding the last admin. */
export async function leaveCommunity(
  communityId: string,
  userId: string,
): Promise<LeaveResult> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });
  if (!community) return "notFound";

  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });
  if (!membership) return "notMember";

  if (membership.role === "ADMIN") {
    const adminCount = await prisma.communityMembership.count({
      where: { communityId, role: "ADMIN", status: "APPROVED" },
    });
    if (adminCount <= 1) return "lastAdmin";
  }

  await prisma.communityMembership.delete({
    where: { userId_communityId: { userId, communityId } },
  });
  return "ok";
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: approve / reject a PENDING membership
// ──────────────────────────────────────────────────────────────────────────────

export type ApproveMemberResult = "notFound" | "forbidden" | "memberNotFound" | "ok";

export async function approveMember(
  communityId: string,
  targetUserId: string,
  callerUserId: string,
  newStatus: "APPROVED" | "REJECTED",
): Promise<ApproveMemberResult> {
  const callerMem = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId: callerUserId, communityId } },
    select: { role: true, status: true },
  });
  if (!callerMem || callerMem.role !== "ADMIN" || callerMem.status !== "APPROVED") {
    return "forbidden";
  }

  const target = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId: targetUserId, communityId } },
  });
  if (!target) return "memberNotFound";

  await prisma.communityMembership.update({
    where: { userId_communityId: { userId: targetUserId, communityId } },
    data: { status: newStatus },
  });
  return "ok";
}
