import { Client, Environment } from "square";
import { getConfigValue } from "@/lib/admin";

// No singleton — always read credentials fresh from DB so config changes
// take effect without a server restart.
export function getSquareClient(): Client {
  const token = getConfigValue("square_access_token") ?? "";
  const env = getConfigValue("square_environment");
  return new Client({
    accessToken: token,
    environment: env === "production" ? Environment.Production : Environment.Sandbox,
  });
}

export function getSquareAppId(): string {
  return getConfigValue("square_application_id") ?? "";
}

export function getSquareLocationId(): string {
  return getConfigValue("square_location_id") ?? "";
}
