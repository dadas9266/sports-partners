import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

const log = createLogger("auth");

export const authOptions: NextAuthOptions = {
  providers: [
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
          user.passwordHash
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
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 gün
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/giris",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
