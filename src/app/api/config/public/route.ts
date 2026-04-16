import { NextResponse } from "next/server";
import { getConfigValue } from "@/lib/admin";

// Returns non-sensitive public config needed by client-side components.
export async function GET() {
  const [
    square_application_id,
    square_location_id,
    square_environment,
    announcement_enabled,
    announcement_message,
    contact_phone,
    contact_email,
    clubhouse_open,
    clubhouse_close,
    season_start,
    season_end,
  ] = await Promise.all([
    getConfigValue("square_application_id"),
    getConfigValue("square_location_id"),
    getConfigValue("square_environment"),
    getConfigValue("announcement_enabled"),
    getConfigValue("announcement_message"),
    getConfigValue("contact_phone"),
    getConfigValue("contact_email"),
    getConfigValue("clubhouse_open"),
    getConfigValue("clubhouse_close"),
    getConfigValue("season_start"),
    getConfigValue("season_end"),
  ]);

  return NextResponse.json({
    square_application_id:  square_application_id  ?? "",
    square_location_id:     square_location_id     ?? "",
    square_environment:     square_environment     ?? "sandbox",
    announcement_enabled:   announcement_enabled   ?? "false",
    announcement_message:   announcement_message   ?? "",
    contact_phone:          contact_phone          ?? "(218) 885-3543",
    contact_email:          contact_email          ?? "golf@swanlakecc.com",
    clubhouse_open:         clubhouse_open         ?? "06:00",
    clubhouse_close:        clubhouse_close        ?? "20:00",
    season_start:           season_start           ?? "05-01",
    season_end:             season_end             ?? "10-31",
  });
}
