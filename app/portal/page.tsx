import CustomerTab from "@/components/dashboard/tabs/CustomerTab";
import { flag, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { getCustomerHistory } from "@/lib/squareCustomers";
import { requirePortal } from "@/lib/portalAccess";

export default async function PortalCustomerPage(props: PageProps<"/portal">) {
  const { account } = await requirePortal();
  const params = (await props.searchParams) as PortalSearchParams;
  const history = await getCustomerHistory(account);

  return (
    <>
      {flag(params, "applied") && (
        <div className="mb-8 rounded-xl border border-flame-2/40 bg-flame-2/10 px-5 py-4 text-sm">
          Application received. Your Brand Ambassador tab, code, and link will
          appear here once our team approves you.
        </div>
      )}
      {flag(params, "new") && (
        <div className="mb-8 rounded-xl border border-flame-2/40 bg-flame-2/10 px-5 py-4 text-sm">
          You&apos;re in. Your account is live below — start exploring.
        </div>
      )}
      <CustomerTab linked={history.linked} profile={history.profile} orders={history.orders} />
    </>
  );
}
