import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, icons/, service-worker.js
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|service-worker\\.js).*)",
  ],
};
