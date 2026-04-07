import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Middleware runs on the Edge runtime — uses the edge-safe authConfig (no DB).
// Only checks authentication; admin authorisation (PostgreSQL lookup)
// happens in the server-component admin layout which runs on Node.js.
export default auth((req) => {
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin");

  if (isAdminPath && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
