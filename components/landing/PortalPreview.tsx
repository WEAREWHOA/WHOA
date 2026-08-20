import Link from "next/link";

const stats = [
  { label: "Clicks", value: "341" },
  { label: "Orders", value: "7" },
  { label: "Sales", value: "$592" },
  { label: "Commission", value: "$59" },
];

export default function PortalPreview() {
  return (
    <section className="border-t border-border py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            Your portal
          </span>
          <h2 className="font-display mt-3 text-4xl tracking-wide sm:text-5xl">
            Every click, order, and{" "}
            <span className="text-flame">dollar</span> — live
          </h2>
          <p className="mt-6 max-w-md text-muted">
            The second you apply, you get a dashboard with your code, your
            link, real-time stats, a tier progress bar, and your recent
            orders. This is a preview of a portal in the wild — yours starts
            at zero and fills up as you share.
          </p>
          <Link href="/apply" className="btn-flame mt-8 inline-block rounded-full px-8 py-4 text-base">
            Get your portal
          </Link>
        </div>

        <div className="card-surface rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Ambassador code</p>
              <p className="font-mono-code mt-1 text-lg text-flame">WHOA-DEMO15</p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: "var(--tier-rising)", color: "#14100c" }}
            >
              Rising
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted">{stat.label}</p>
                <p className="font-display mt-1 text-2xl tracking-wide">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs text-muted">
              <span>Rising</span>
              <span>Icon at 20 orders</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div className="bg-flame h-full rounded-full" style={{ width: "35%" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
