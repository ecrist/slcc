import { Client, Environment } from "square";
import { getConfigValue } from "@/lib/admin";

// No singleton — always read credentials fresh from DB so config changes
// take effect without a server restart.
export async function getSquareClient(): Promise<Client> {
  const token = (await getConfigValue("square_access_token")) ?? "";
  const env = await getConfigValue("square_environment");
  return new Client({
    accessToken: token,
    environment: env === "production" ? Environment.Production : Environment.Sandbox,
  });
}

export async function getSquareAppId(): Promise<string> {
  return (await getConfigValue("square_application_id")) ?? "";
}

export async function getSquareLocationId(): Promise<string> {
  return (await getConfigValue("square_location_id")) ?? "";
}
