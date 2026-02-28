"use client";

export default function GizlilikPage() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gizlilik</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profil Görünürlüğü</p>
            <p className="text-xs text-gray-400 mt-0.5">Profil bilgilerin herkese açık</p>
          </div>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">
            Herkese Açık
          </span>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">İlan Geçmişi</p>
            <p className="text-xs text-gray-400 mt-0.5">Geçmiş ilanların herkese görünür</p>
          </div>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">
            Açık
          </span>
        </div>

        <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Detaylı gizlilik kontrolleri yakında eklenecek.
          </p>
        </div>
      </div>

      {/* Engellenenler */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Engellenen Kullanıcılar</h3>
        <div className="p-6 text-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <span className="text-3xl">🚫</span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Engellediğin kullanıcı yok.</p>
        </div>
      </div>
    </div>
  );
}
