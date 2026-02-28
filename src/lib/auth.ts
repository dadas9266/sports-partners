import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

const log = createLogger("auth");

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Sosyal Giriş ──────────────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []),
    // ── E-posta / Şifre ───────────────────────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve şifre gereklidir");
        }

        // Email-based rate limit for login
        const rateCheck = checkRateLimit(credentials.email, "auth");
        if (!rateCheck.allowed) {
          log.warn("Login rate limit aşıldı", { email: credentials.email });
          throw new Error("Çok fazla giriş denemesi. 15 dakika bekleyin.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("E-posta veya şifre hatalı");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash ?? ""
        );

        if (!isValid) {
          log.warn("Hatalı şifre denemesi", { email: credentials.email });
          throw new Error("E-posta veya şifre hatalı");
        }

        log.info("Kullanıcı giriş yaptı", { userId: user.id });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 gün
  },
  callbacks: {
    // OAuth ile giriş yapınca kullanıcıyı DB'ye kaydet veya güncelle
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const existing = await prisma.user.findUnique({ where: { email: user.email! } });
          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name ?? user.email!.split("@")[0],
                avatarUrl: user.image ?? null,
                onboardingDone: false,
              },
            });
            log.info("OAuth ile yeni kullanıcı oluşturuldu", { email: user.email, provider: account.provider });
          } else if (user.image && !existing.avatarUrl) {
            await prisma.user.update({ where: { id: existing.id }, data: { avatarUrl: user.image } });
          }
        } catch (err) {
          log.error("OAuth signIn DB hatası", { err });
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Credentials: user.id doğrudan gelir
        // OAuth: DB'den çek
        if (account?.provider === "google" || account?.provider === "github") {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email! },
            select: { id: true, isAdmin: true },
          });
          token.id = dbUser?.id ?? token.sub;
          token.isAdmin = dbUser?.isAdmin ?? false;
        } else {
          token.id = user.id;
          token.isAdmin = (user as { id: string; isAdmin?: boolean }).isAdmin ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/giris",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
