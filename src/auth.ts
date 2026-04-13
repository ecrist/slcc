import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { authConfig } from "@/auth.config";

// Load Google and Apple credentials from site_config at request time so that
// changes saved in Admin → Settings take effect without a server restart.
async function loadOAuthConfig() {
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM site_config
     WHERE key IN ('google_client_id', 'google_client_secret', 'apple_id', 'apple_secret')`
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

export const { auth, handlers, signIn, signOut } = NextAuth(async () => {
  const cfg = await loadOAuthConfig();

  return {
    ...authConfig,
    callbacks: {
      async jwt({ token, user, trigger }) {
        if (user) {
          token.id = user.id;
          token.name = user.name;
        }
        if (user?.email) token.isAdmin = await isAdminEmail(user.email);
        // Refresh name/email from DB on every token refresh so profile
        // changes show up without requiring a new login.
        if (token.id && (trigger === "update" || !user)) {
          const fresh = await queryOne<{ name: string; email: string }>(
            "SELECT name, email FROM users WHERE id = $1",
            [token.id]
          );
          if (fresh) {
            token.name = fresh.name;
            token.email = fresh.email;
          }
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && token.id) session.user.id = token.id as string;
        if (session.user) session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        if (session.user && token.name) session.user.name = token.name as string;
        if (session.user && token.email) session.user.email = token.email as string;
        return session;
      },
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;
          const user = await queryOne<{
            id: number;
            name: string;
            email: string;
            password_hash: string;
          }>("SELECT * FROM users WHERE email = $1", [
            (credentials.email as string).trim().toLowerCase(),
          ]);
          if (!user) return null;
          const valid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          );
          if (!valid) return null;
          return { id: String(user.id), name: user.name, email: user.email };
        },
      }),
      // Only include OAuth providers when credentials are configured
      ...(cfg.google_client_id
        ? [Google({ clientId: cfg.google_client_id, clientSecret: cfg.google_client_secret })]
        : []),
      ...(cfg.apple_id
        ? [Apple({ clientId: cfg.apple_id, clientSecret: cfg.apple_secret })]
        : []),
    ],
  };
});
