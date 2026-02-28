"use client";

import Link from "next/link";
import Image from "next/image";
import Badge from "@/components/ui/Badge";

export type CommunityType = "GROUP" | "CLUB" | "TEAM";

export interface CommunityCardData {
  id: string;
  type: CommunityType;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  isPrivate: boolean;
  sport?: { id: string; name: string; icon?: string | null } | null;
  city?: { id: string; name: string } | null;
  creator: { id: string; name: string | null; avatarUrl?: string | null };
  _count: { members: number };
  /** If provided, the current user's membership status */
  myStatus?: "APPROVED" | "PENDING" | null;
}

const TYPE_META: Record<CommunityType, { label: string; icon: string; variant: "blue" | "purple" | "emerald" }> = {
  GROUP: { label: "Grup", icon: "👥", variant: "blue" },
  CLUB: { label: "Kulüp", icon: "🏛️", variant: "purple" },
  TEAM: { label: "Takım", icon: "⚽", variant: "emerald" },
};

interface Props {
  community: CommunityCardData;
  onJoin?: (id: string) => void;
  onLeave?: (id: string) => void;
  joining?: boolean;
}

export default function CommunityCard({ community, onJoin, onLeave, joining }: Props) {
  const meta = TYPE_META[community.type];

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Header strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Avatar + title */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
            {community.avatarUrl ? (
              <Image
                src={community.avatarUrl}
                alt={community.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              meta.icon
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Link
              href={`/topluluklar/${community.id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1 transition-colors"
            >
              {community.name}
            </Link>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Badge variant={meta.variant} size="sm">
                {meta.icon} {meta.label}
              </Badge>
              {community.isPrivate && (
                <Badge variant="yellow" size="sm">🔒 Özel</Badge>
              )}
              {community.sport && (
                <Badge variant="gray" size="sm">
                  {community.sport.icon ?? ""} {community.sport.name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {community.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {community.description}
          </p>
        )}

        {/* Footer: meta + action */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>👤 {community._count.members} üye</span>
            {community.city && <span>📍 {community.city.name}</span>}
          </div>

          {onJoin && community.myStatus == null && (
            <button
              onClick={() => onJoin(community.id)}
              disabled={joining}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
            >
              {community.isPrivate ? "Talep Gönder" : "Katıl"}
            </button>
          )}

          {onJoin && community.myStatus === "PENDING" && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">⏳ Beklemede</span>
          )}

          {onLeave && community.myStatus === "APPROVED" && (
            <button
              onClick={() => onLeave(community.id)}
              disabled={joining}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
            >
              Ayrıl
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
