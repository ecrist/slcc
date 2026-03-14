import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Middleware runs on the Edge runtime where better-sqlite3 is unavailable,
// so it only checks authentication. Admin authorisation (DB lookup) happens
// in the server-component admin layout, which runs on Node.js.
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
