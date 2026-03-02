"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface FollowUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  userType: string | null;
  trainerProfile?: { isVerified: boolean } | null;
}

interface FollowListModalProps {
  open: boolean;
  type: "followers" | "following";
  onClose: () => void;
  onCountChange?: () => void;
}

export default function FollowListModal({
  open,
  type,
  onClose,
  onCountChange,
}: FollowListModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/follows?type=${type}`);
      const json = await res.json();
      if (json.success) setUsers(json.users ?? []);
    } catch {
      toast.error("Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  const handleRemoveFollower = async (userId: string) => {
    setActionId(userId);
    try {
      // DELETE /api/users/[id]/follow — removes this person from MY followers
      const res = await fetch(`/api/users/${userId}/follow`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Takipçi kaldırıldı");
        onCountChange?.();
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setActionId(null);
    }
  };

  const handleUnfollow = async (userId: string) => {
    setActionId(userId);
    try {
      // POST /api/users/[id]/follow — toggle (unfollow since currently following)
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Takip bırakıldı");
        onCountChange?.();
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setActionId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">
            {type === "followers" ? "👥 Takipçiler" : "👤 Takip Edilenler"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-4xl">👻</span>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {type === "followers" ? "Henüz takipçin yok" : "Kimseyi takip etmiyorsun"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  {/* Avatar */}
                  <Link href={`/profil/${user.id}`} onClick={onClose}>
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-emerald-700">
                          {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profil/${user.id}`}
                      onClick={onClose}
                      className="font-semibold text-gray-800 dark:text-gray-100 text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition truncate block"
                    >
                      {user.name ?? "İsimsiz"}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {user.userType === "TRAINER" && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                          🏅 Antrenör
                        </span>
                      )}
                      {user.userType === "VENUE" && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                          🏟️ Tesis
                        </span>
                      )}
                      {user.bio && (
                        <span className="text-xs text-gray-400 truncate max-w-[140px]">{user.bio}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    disabled={actionId === user.id}
                    onClick={() =>
                      type === "followers"
                        ? handleRemoveFollower(user.id)
                        : handleUnfollow(user.id)
                    }
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition border disabled:opacity-50
                      text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300"
                  >
                    {actionId === user.id
                      ? "..."
                      : type === "followers"
                      ? "Kaldır"
                      : "Bırak"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
