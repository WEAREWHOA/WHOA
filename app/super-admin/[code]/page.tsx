import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getByCode } from "@/lib/store";
import { updateAccountPermissionsAction } from "@/app/super-admin/actions";

const PERMISSION_ROWS = [
  {
    field: "perm_ambassador",
    permission: "ambassador",
    label: "Brand Ambassador",
    hint: "Referral link, links manager, payouts, commissions.",
  },
  {
    field: "perm_vendor",
    permission: "vendor",
    label: "Artist/Vendor",
    hint: "ARTIST/VENDOR tab — needs a vendor slug set below to show data.",
  },
  {
    field: "perm_music",
    permission: "music",
    label: "Music",
    hint: "MUSIC tab — self-editable artist bio, genre, and links. Approves a Music Collective application.",
  },
  {
    field: "perm_ssbd",
    permission: "ssbd",
    label: "SSBD",
    hint: "Same Same But Different crew submissions.",
  },
  {
    field: "perm_events_admin",
    permission: "eventsAdmin",
    label: "Events Admin",
    hint: "EVENTS ADMIN tab — KPIs and guest lists for every event. Super Admins already have this.",
  },
  {
    field: "perm_event_sales",
    permission: "eventSales",
    label: "Event Sales",
    hint: "EVENT SALES tab — sign up to work events. Approves a Sell For Us application.",
  },
] as const;

export default async function SuperAdminAccountPage(props: PageProps<"/super-admin/[code]">) {
  await requireSuperAdmin();
  const { code } = await props.params;
  const searchParams = await props.searchParams;
  const saved = searchParams?.saved === "1";

  const account = await getByCode(code);
  if (!account) notFound();

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link href="/super-admin" className="text-sm text-muted hover:text-foreground">
        ← Back to search
      </Link>

      <span className="mt-6 block text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Super Admin
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">{account.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {account.email} · <span className="font-mono-code">{account.code}</span>
      </p>

      {saved && (
        <div className="mt-6 rounded-xl border border-flame-2/40 bg-flame-2/10 px-5 py-4 text-sm">
          Saved — permissions updated.
        </div>
      )}

      <form action={updateAccountPermissionsAction} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="code" value={account.code} />

        <div className="card-surface flex flex-col divide-y divide-border rounded-2xl border border-border">
          {PERMISSION_ROWS.map((row) => (
            <label key={row.field} className="flex items-start gap-3 p-4">
              <input
                type="checkbox"
                name={row.field}
                defaultChecked={account.permissions[row.permission]}
                className="mt-1 h-4 w-4 accent-flame-2"
              />
              <span>
                <span className="block text-sm font-semibold">{row.label}</span>
                <span className="block text-xs text-muted">{row.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="vendor_slug" className="text-sm font-medium">
            Vendor slug
          </label>
          <input
            id="vendor_slug"
            name="vendor_slug"
            type="text"
            defaultValue={account.vendorSlug ?? ""}
            placeholder="matches a slug in lib/artists.ts"
            className="font-mono-code mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <label className="border-flame-1/40 bg-flame-1/10 flex items-start gap-3 rounded-xl border p-4">
          <input
            type="checkbox"
            name="is_super_admin"
            defaultChecked={account.isSuperAdmin}
            className="accent-flame-1 mt-1 h-4 w-4"
          />
          <span>
            <span className="text-flame-3 block text-sm font-semibold">Super Admin</span>
            <span className="block text-xs text-muted">
              Full access to this page for every account, including granting/revoking Super
              Admin itself. Grant carefully.
            </span>
          </span>
        </label>

        <button type="submit" className="btn-flame mt-2 self-start rounded-full px-8 py-3 text-sm">
          Save changes
        </button>
      </form>
    </section>
  );
}
