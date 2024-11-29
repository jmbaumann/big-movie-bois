import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@repo/db";

import { env } from "../env.mjs";

/**
 * Module augmentation for `next-auth` types
 * Allows us to add custom properties to the `session` object
 * and keep type safety
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string | null;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string | null;
    isAdmin: boolean;
  }

  interface JWT {
    username: string | null;
    email: string;
  }
}

/**
 * Options for NextAuth.js used to configure
 * adapters, providers, callbacks, etc.
 * @see https://next-auth.js.org/configuration/options
 **/
export const authOptions: NextAuthOptions = {
  callbacks: {
    async jwt({ token, user, session, trigger }) {
      if (trigger === "update") token.username = session.username;
      if (user) {
        token.username = user.username || null;
        token.email = user.email;
        token.isAdmin = !!user.isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email;
        session.user.username = token.username as string | null;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
};
