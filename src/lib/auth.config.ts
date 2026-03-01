import type { NextAuthConfig } from "next-auth";

/**
 * Minimal NextAuth config — Edge Runtime safe.
 * No PrismaClient, bcryptjs, or Node.js-only imports.
 * Used by src/middleware.ts.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/auth/giris",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // real providers are in auth.ts (server-only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Admin rotaları — isAdmin zorunlu
      if (pathname.startsWith("/admin")) {
        return (auth?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;
      }

      // Korumalı rotalar — giriş zorunlu
      const protectedPaths = ["/profil", "/mesajlar", "/ilan/olustur", "/onboarding"];
      if (protectedPaths.some((p) => pathname.startsWith(p))) {
        return isLoggedIn;
      }

      return true;
    },
  },
};
