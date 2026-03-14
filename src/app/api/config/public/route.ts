import { NextResponse } from "next/server";
import { getConfigValue } from "@/lib/admin";

// Returns non-sensitive public config needed by client-side components.
// Square credentials are safe to expose (appId and locationId are public;
// the access token stays server-side).
export async function GET() {
  return NextResponse.json({
    square_application_id: getConfigValue("square_application_id") ?? "",
    square_location_id: getConfigValue("square_location_id") ?? "",
    square_environment: getConfigValue("square_environment") ?? "sandbox",
  });
}
