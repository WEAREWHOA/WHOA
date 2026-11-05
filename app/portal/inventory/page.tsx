import InventoryTab from "@/components/dashboard/tabs/InventoryTab";
import { flag, text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { listStockLines, recentMovements } from "@/lib/inventoryAdmin";
import { getSquareLocationId } from "@/lib/square";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalInventoryPage(props: PageProps<"/portal/inventory">) {
  await requirePortalTab("inventory");
  const params = (await props.searchParams) as PortalSearchParams;
  const query = (text(params, "q") ?? "").trim();

  // Both halves fail soft, and separately. A catalogue that will not
  // load should not also take away the ledger, which is the half
  // somebody is most likely here to read when a number looks wrong.
  const [lines, movements] = await Promise.all([
    (async () => listStockLines(getSquareLocationId()))().catch((err) => {
      console.error("Couldn't list stock lines:", err);
      return [];
    }),
    recentMovements(50).catch((err) => {
      console.error("Couldn't list stock movements:", err);
      return [];
    }),
  ]);

  const needle = query.toLowerCase();
  const matches = needle
    ? lines.filter(
        (line) =>
          line.productName.toLowerCase().includes(needle) ||
          line.variationName.toLowerCase().includes(needle),
      )
    : lines;

  return (
    <InventoryTab
      lines={matches}
      total={lines.length}
      movements={movements}
      query={query}
      saved={flag(params, "stockSaved")}
      seeded={text(params, "stockSeeded")}
      error={text(params, "stockError")}
    />
  );
}
