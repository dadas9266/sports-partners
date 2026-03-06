import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  typescript: { ignoreBuildErrors: false },

  // Güvenlik başlıkları
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Eski grup/kulüp URL'lerini yeni topluluk URL'lerine yönlendir
  async redirects() {
    return [
      { source: "/gruplar",        destination: "/topluluklar?type=GROUP", permanent: false },
      { source: "/gruplar/:id",    destination: "/topluluklar/:id",        permanent: false },
      { source: "/gruplarim",      destination: "/topluluklarim",          permanent: false },
      { source: "/kulupler",       destination: "/topluluklar?type=CLUB",  permanent: false },
      { source: "/kulupler/:id",   destination: "/topluluklar/:id",        permanent: false },
      { source: "/kuluplerim",     destination: "/topluluklarim",          permanent: false },
    ];
  },

  // Dış görsel kaynakları (ileride avatar upload için)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  // Vercel Serverless için Prisma binary
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/.prisma/**"],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
