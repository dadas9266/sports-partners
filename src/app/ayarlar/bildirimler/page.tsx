"use client";

import { usePushNotification } from "@/hooks/usePushNotification";

export default function BildirimlerPage() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotification();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Bildirimler</h2>
        <p className="text-sm text-gray-400 mt-1">
          Tarayıcı push bildirimi tercihlerinizi yönetin.
        </p>
      </div>

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white">Push Bildirimleri</h3>

        {!isSupported ? (
          <p className="text-sm text-yellow-400">
            Tarayıcınız push bildirimleri desteklemiyor.
          </p>
        ) : permission === "denied" ? (
          <p className="text-sm text-red-400">
            Bildirim izni reddedildi. Tarayıcı ayarlarından izin verin.
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">
                {isSubscribed
                  ? "Push bildirimleri aktif."
                  : "Maç istekleri, mesajlar ve eşleşme bildirimleri alın."}
              </p>
              {permission === "default" && !isSubscribed && (
                <p className="text-xs text-gray-500 mt-1">
                  Etkinleştirdiğinizde tarayıcı izin isteyecektir.
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
        Push bildirimleri yalnızca bu cihaz ve tarayıcı için geçerlidir. Farklı
        bir cihazda da bildirim almak için oradan da etkinleştirin.
      </p>
    </div>
  );
}
