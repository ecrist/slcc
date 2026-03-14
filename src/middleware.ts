import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin");

  if (isAdminPath) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const userEmail = req.auth.user?.email || "";

    if (!adminEmails.includes(userEmail)) {
      return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
