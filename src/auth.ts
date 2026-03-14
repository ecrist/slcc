import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { authConfig } from "@/auth.config";

// Read OAuth credentials from the database at request time so config changes
// take effect without a server restart.
function dbCfg(key: string): string {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM site_config WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = getDb();
        const user = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get((credentials.email as string).trim().toLowerCase()) as
          | { id: number; name: string; email: string; password_hash: string }
          | undefined;
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
        if (!valid) return null;
        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
    Google({
      clientId: dbCfg("google_client_id"),
      clientSecret: dbCfg("google_client_secret"),
    }),
    Apple({
      clientId: dbCfg("apple_id"),
      clientSecret: dbCfg("apple_secret"),
    }),
  ],
});
