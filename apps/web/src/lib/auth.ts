import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@pulse/db";

const publicAppUrl =
  process.env.AUTH_URL ||
  process.env.NEXTAUTH_URL ||
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://pulse.rumptycloud.app"
    : "http://localhost:3000");

process.env.AUTH_URL = publicAppUrl;
process.env.NEXTAUTH_URL = publicAppUrl;

const authSecret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET_KEY;

const githubId =
  process.env.AUTH_GITHUB_ID ||
  process.env.GITHUB_ID ||
  process.env.GITHUB_CLIENT_ID;

const githubSecret =
  process.env.AUTH_GITHUB_SECRET ||
  process.env.GITHUB_SECRET ||
  process.env.GITHUB_CLIENT_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers: [
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async redirect({ url, baseUrl }) {
      const cleanBase = publicAppUrl.replace(/\/$/, "");
      if (url.startsWith("/")) {
        return `${cleanBase}${url}`;
      }
      try {
        const parsed = new URL(url);
        if (
          parsed.hostname === "0.0.0.0" ||
          (parsed.hostname === "localhost" && process.env.NODE_ENV === "production")
        ) {
          return `${cleanBase}${parsed.pathname}${parsed.search}`;
        }
      } catch {}
      if (url.startsWith(cleanBase)) {
        return url;
      }
      return cleanBase;
    },
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
});
