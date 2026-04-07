import { NextResponse } from "next/server";
import { getConfigValue } from "@/lib/admin";

// Returns non-sensitive public config needed by client-side components.
export async function GET() {
  return NextResponse.json({
    square_application_id: (await getConfigValue("square_application_id")) ?? "",
    square_location_id:    (await getConfigValue("square_location_id"))    ?? "",
    square_environment:    (await getConfigValue("square_environment"))    ?? "sandbox",
  });
}
