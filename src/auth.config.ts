import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Node.js-only imports (no DB, no bcrypt).
// Used by middleware for JWT session validation only.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [],
};
