/**
 * membership-utils.ts
 *
 * Shared helpers for the club / group membership-management routes.
 * Keeps "approve / reject / remove / promote / demote" action handling DRY.
 */

import { z } from "zod";
import { createNotification } from "@/lib/notifications";

// ──────────────────────────────────────────────────────────────────────────────
// Action schema — identical for clubs and groups
// ──────────────────────────────────────────────────────────────────────────────

export const membershipActionSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "promote", "demote"]),
});
export type MembershipAction = z.infer<typeof membershipActionSchema>["action"];

// ──────────────────────────────────────────────────────────────────────────────
// Notification helpers
// ──────────────────────────────────────────────────────────────────────────────

interface MemberNotifyOptions {
  targetUserId: string;
  entityName: string;
  /** URL to link to on the notification. */
  link: string;
}

/** Notify the requester that their membership was approved. */
export function notifyApproved(opts: MemberNotifyOptions) {
  return createNotification({
    userId: opts.targetUserId,
    type: "MATCH_STATUS_CHANGED",
    title: "Üyelik Talebiniz Onaylandı",
    body: `"${opts.entityName}" topluluğuna üyeliğiniz onaylandı!`,
    link: opts.link,
  }).catch(() => {});
}

/** Notify the requester that their membership was rejected. */
export function notifyRejected(opts: MemberNotifyOptions) {
  return createNotification({
    userId: opts.targetUserId,
    type: "MATCH_STATUS_CHANGED",
    title: "Üyelik Talebiniz Reddedildi",
    body: `"${opts.entityName}" topluluğuna üyelik talebiniz reddedildi.`,
    link: opts.link,
  }).catch(() => {});
}

// ──────────────────────────────────────────────────────────────────────────────
// Generic membership record shape expected by the action handler
// ──────────────────────────────────────────────────────────────────────────────

export interface MemberRecord {
  id: string;
  userId: string;
  role: string;
  status: string;
}

export type MemberActionResult =
  | { ok: true; message: string }
  | { error: string; status: number };

/**
 * Validate and run a membership action generically.
 *
 * The caller provides:
 * - `target` — the membership row being acted on
 * - `callerUserId` — the admin/captain doing the action
 * - `action` — the validated action string
 * - Prisma callbacks for update / delete operations
 * - Notification link + entity name for user-facing messages
 */
export async function handleMemberAction(opts: {
  target: MemberRecord;
  callerUserId: string;
  action: MembershipAction;
  adminRole: string;       // "CAPTAIN" for clubs, "ADMIN" for groups
  entityName: string;
  entityLink: string;      // Used in approval/rejection notifications
  onUpdate: (id: string, data: { status?: string; role?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}): Promise<MemberActionResult> {
  const { target, callerUserId, action, adminRole, entityName, entityLink, onUpdate, onDelete } = opts;

  // Prevent self-modification for destructive actions
  if (target.userId === callerUserId && ["remove", "demote"].includes(action)) {
    return { error: "Kendinizi bu şekilde düzenleyemezsiniz", status: 400 };
  }

  switch (action) {
    case "approve": {
      if (target.status !== "PENDING") return { error: "Bu üyelik zaten işlendi", status: 400 };
      await onUpdate(target.id, { status: "APPROVED" });
      await notifyApproved({ targetUserId: target.userId, entityName, link: entityLink });
      return { ok: true, message: "Üyelik onaylandı" };
    }

    case "reject": {
      if (target.status !== "PENDING") return { error: "Bu üyelik zaten işlendi", status: 400 };
      await onDelete(target.id);
      await notifyRejected({ targetUserId: target.userId, entityName, link: entityLink });
      return { ok: true, message: "Talep reddedildi" };
    }

    case "remove": {
      if (target.status !== "APPROVED") return { error: "Yalnızca onaylı üyeler çıkarılabilir", status: 400 };
      await onDelete(target.id);
      return { ok: true, message: "Üye çıkarıldı" };
    }

    case "promote": {
      if (target.role === adminRole) return { error: "Üye zaten bu rolde", status: 400 };
      await onUpdate(target.id, { role: adminRole });
      return { ok: true, message: "Üye yükseltildi" };
    }

    case "demote": {
      if (target.role === "MEMBER") return { error: "Üye zaten bu rolde", status: 400 };
      await onUpdate(target.id, { role: "MEMBER" });
      return { ok: true, message: "Üye indirildi" };
    }

    default:
      return { error: "Geçersiz işlem", status: 400 };
  }
}
