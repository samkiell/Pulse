import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@pulse/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "f6c8d4e2b0a1928374650192837465ab",
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || "Ov23liRaiyGCH0AmjZIa",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "cdc2572e84737000d7c441fc1fb0bfda5f1a82f3",
    }),
  ],
  debug: true,
  callbacks: {
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
