import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // /admin/* — sadece isAdmin:true olan kullanıcılar
    if (pathname.startsWith("/admin")) {
      if (!token?.isAdmin) {
        const loginUrl = new URL("/auth/giris", req.url);
        loginUrl.searchParams.set("callbackUrl", req.url);
        loginUrl.searchParams.set("error", "AdminRequired");
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // /admin/* ve korumalı rotalar için giriş zorunlu
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Admin rotaları — mutlaka token gerekli
        if (pathname.startsWith("/admin")) return !!token;

        // Profil, mesajlar, ilan oluşturma — giriş gerekli
        if (
          pathname.startsWith("/profil") ||
          pathname.startsWith("/mesajlar") ||
          pathname.startsWith("/ilan/olustur") ||
          pathname.startsWith("/onboarding")
        ) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/auth/giris",
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/profil/:path*",
    "/mesajlar/:path*",
    "/ilan/olustur/:path*",
    "/onboarding/:path*",
  ],
};
