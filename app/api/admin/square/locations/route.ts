import { getSquare } from "@/lib/square";
import { checkAdminSecret } from "@/lib/squareAdminAuth";

export const runtime = "nodejs";

// Read-only lookup so SQUARE_LOCATION_ID doesn't have to be hunted down in
// Square's dashboard — only needs SQUARE_ACCESS_TOKEN to already be set.
export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const square = getSquare();
    const response = await square.locations.list();

    const locations = (response.locations ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      status: location.status,
      address: location.address
        ? [location.address.addressLine1, location.address.locality, location.address.administrativeDistrictLevel1]
            .filter(Boolean)
            .join(", ")
        : undefined,
    }));

    return Response.json({ locations });
  } catch (err) {
    console.error("locations lookup failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
