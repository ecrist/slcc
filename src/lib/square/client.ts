import { Client, Environment } from "square";

let squareClient: Client | null = null;

export function getSquareClient(): Client {
  if (!squareClient) {
    squareClient = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment:
        process.env.SQUARE_ENVIRONMENT === "production"
          ? Environment.Production
          : Environment.Sandbox,
    });
  }
  return squareClient;
}

export function getSquareAppId(): string {
  return process.env.SQUARE_APPLICATION_ID || "";
}

export function getSquareLocationId(): string {
  return process.env.SQUARE_LOCATION_ID || "";
}
