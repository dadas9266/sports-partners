import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SporPartner - Spor Partneri & Rakip Bul",
  description:
    "Spor yapmak için partner veya rakip bul! Futbol, basketbol, tenis ve daha fazlası.",
  keywords: ["spor", "partner", "rakip", "futbol", "basketbol", "tenis", "spor partneri bul"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SporPartner",
  },
  openGraph: {
    title: "SporPartner - Spor Partneri & Rakip Bul",
    description: "Spor yapmak için partner veya rakip bul!",
    type: "website",
    locale: "tr_TR",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#059669" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("/service-worker.js"); }); }`
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 transition-colors`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-emerald-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold">
              İçeriğe atla
            </a>
            <Navbar />
            <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">{children}</main>
            <footer className="hidden md:block border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-8">
              <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>© {new Date().getFullYear()} SporPartner</span>
                <nav className="flex items-center gap-4">
                  <a href="/gizlilik-politikasi" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Gizlilik Politikası</a>
                  <a href="/kullanim-sartlari" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Kullanım Şartları</a>
                </nav>
              </div>
            </footer>
            <BottomNav />
            <PWAInstallBanner />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
