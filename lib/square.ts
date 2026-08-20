import { SquareClient, SquareEnvironment } from "square";

let client: SquareClient | null = null;

// Lazily created for the same reason as lib/supabase.ts's getSupabase():
// importing this module happens at build time for every route, so the env
// vars must not be required until a request actually calls getSquare().
export function getSquare(): SquareClient {
  if (client) return client;

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing Square env var: SQUARE_ACCESS_TOKEN is required.");
  }

  const environment =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

  client = new SquareClient({ token, environment });
  return client;
}

export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error("Missing Square env var: SQUARE_LOCATION_ID is required.");
  }
  return locationId;
}
