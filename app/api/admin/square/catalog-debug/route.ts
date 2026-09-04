import { getSquare, getSquareLocationId } from "@/lib/square";
import { getOnlineStoreChannelId } from "@/lib/catalog";
import { checkAdminSecret } from "@/lib/squareAdminAuth";

export const runtime = "nodejs";

// Diagnostic for "the shop shows no products" — /shop only lists items
// carrying Square's "Online Store" channel, resolved by name via
// channels.list() (see lib/catalog.ts). This surfaces exactly what that
// resolution sees: the raw channel list, and per-item whether the
// channels array (Square's own, read-only, computed field) includes it —
// so a broken match can be diagnosed without guessing.
export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const square = getSquare();
    const locationId = getSquareLocationId();

    const channelsPage = await square.channels.list({ status: "ACTIVE" });
    const channels: { id: string; name: string | undefined; status: string | undefined }[] = [];
    for await (const channel of channelsPage) {
      channels.push({ id: channel.id ?? "", name: channel.name ?? undefined, status: channel.status ?? undefined });
    }

    const onlineStoreChannelId = await getOnlineStoreChannelId();

    let rawItems: NonNullable<Awaited<ReturnType<typeof square.catalog.searchItems>>["items"]> = [];
    let cursor: string | undefined;
    do {
      const itemsResponse = await square.catalog.searchItems({
        enabledLocationIds: [locationId],
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      rawItems = rawItems.concat(itemsResponse.items ?? []);
      cursor = itemsResponse.cursor;
    } while (cursor);

    const items = rawItems
      .filter((item) => item.type === "ITEM")
      .map((item) => {
        const data = item.itemData;
        const itemChannels = data?.channels ?? [];
        return {
          id: item.id,
          name: data?.name ?? "Untitled",
          isArchived: data?.isArchived ?? false,
          channels: itemChannels,
          matchesOnlineStoreChannel: onlineStoreChannelId
            ? itemChannels.includes(onlineStoreChannelId)
            : false,
          hasImage: (data?.imageIds?.length ?? 0) > 0,
        };
      });

    return Response.json({
      locationId,
      resolvedOnlineStoreChannelId: onlineStoreChannelId,
      activeChannels: channels,
      totalItems: items.length,
      itemsWithAnyChannel: items.filter((i) => i.channels.length > 0).length,
      itemsMatchingOnlineStore: items.filter((i) => i.matchesOnlineStoreChannel).length,
      itemsWithImage: items.filter((i) => i.hasImage).length,
      items,
    });
  } catch (err) {
    console.error("catalog-debug failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
