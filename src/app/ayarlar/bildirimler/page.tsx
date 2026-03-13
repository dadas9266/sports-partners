"use client";

import { usePushNotification } from "@/hooks/usePushNotification";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

export default function BildirimlerPage() {
  const locale = useLocale();
  const isTr = locale === "tr";
  const tSettings = useTranslations("settings");
  const tPush = useTranslations("settings.pushNotifications");
  const permissionHint = isTr
    ? "Etkinleştirdiğinizde tarayıcı izin isteyecektir."
    : "Your browser will ask for permission when you enable it.";
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotification();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{tSettings("notifications")}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {tPush("description")}
        </p>
      </div>

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white">{tPush("title")}</h3>

        {!isSupported ? (
          <p className="text-sm text-yellow-400">
            {tPush("unsupported")}
          </p>
        ) : permission === "denied" ? (
          <p className="text-sm text-red-400">
            {tPush("denied")}
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">
                {isSubscribed
                  ? tPush("active")
                  : tPush("description")}
              </p>
              {permission === "default" && !isSubscribed && (
                <p className="text-xs text-gray-500 mt-1">
                  {permissionHint}
                </p>
              )}
            </div>

            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isSubscribed ? "bg-emerald-500" : "bg-gray-600"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSubscribed ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {tPush("description")}
      </p>
    </div>
  );
}
