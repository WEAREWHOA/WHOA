import WalletTab from "@/components/dashboard/tabs/WalletTab";
import { requirePortalTab } from "@/lib/portalAccess";
import { walletForAccount, walletMovements } from "@/lib/wallet";

export default async function PortalWalletPage() {
  const { account } = await requirePortalTab("wallet");

  // Read, never created. A wallet is opened by somebody redeeming a
  // code or pressing a button, not by a page being looked at, which
  // keeps the table free of rows for accounts that never used one.
  const wallet = await walletForAccount(account.code).catch((err) => {
    console.error("Couldn't read the wallet for %s:", account.code, err);
    return null;
  });

  const movements = wallet
    ? await walletMovements(wallet.id).catch((err) => {
        console.error("Couldn't read wallet history for %s:", account.code, err);
        return [];
      })
    : [];

  return <WalletTab wallet={wallet} movements={movements} />;
}
