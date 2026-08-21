import Link from "next/link";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { searchAccounts } from "@/lib/store";

export default async function SuperAdminPage(props: PageProps<"/super-admin">) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const results = q ? await searchAccounts(q) : [];

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Super Admin</span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">Account permissions</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Search by name, email, or account code to view or edit what an account can access.
      </p>

      <form action="/super-admin" className="mt-8 flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, or code..."
          className="flex-1 rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
        />
        <button type="submit" className="btn-flame rounded-full px-6 py-3 text-sm">
          Search
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-3">
        {q && results.length === 0 && (
          <p className="text-sm text-muted">No accounts match &ldquo;{q}&rdquo;.</p>
        )}
        {results.map((account) => (
          <Link
            key={account.code}
            href={`/super-admin/${account.code}`}
            className="card-surface flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-flame-2/50"
          >
            <div>
              <p className="text-sm font-semibold">{account.name}</p>
              <p className="text-xs text-muted">{account.email}</p>
            </div>
            <span className="font-mono-code text-xs text-muted">{account.code}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
