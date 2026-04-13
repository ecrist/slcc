import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Middleware runs on the Edge runtime — uses the edge-safe authConfig (no DB).
// Only checks authentication; admin authorisation (PostgreSQL lookup)
// happens in the server-component admin layout which runs on Node.js.
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isProtected = path.startsWith("/admin") || path.startsWith("/settings");

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/settings/:path*"],
};
