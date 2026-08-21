import { checkAdminSecret } from "@/lib/squareAdminAuth";
import { getArtist } from "@/lib/artists";
import { setVendorSlug } from "@/lib/store";

export const runtime = "nodejs";

// One-time admin action: links an existing ambassador account to a vendor
// slug (see lib/artists.ts) so that account's dashboard Vendor tab shows
// real sales/inventory scoped to that vendor. No self-serve claim flow yet.
export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { code?: string; vendorSlug?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code?.trim();
  const vendorSlug = body.vendorSlug?.trim();

  if (!code || !vendorSlug) {
    return Response.json({ error: "Both code and vendorSlug are required" }, { status: 400 });
  }

  const artist = getArtist(vendorSlug);
  if (!artist) {
    return Response.json({ error: `No vendor found with slug "${vendorSlug}"` }, { status: 404 });
  }

  const ok = await setVendorSlug(code, vendorSlug);
  if (!ok) {
    return Response.json({ error: `Failed to link — is "${code}" a real ambassador code?` }, { status: 500 });
  }

  return Response.json({ linked: true, code: code.toUpperCase(), vendorName: artist.name, vendorSlug });
}
