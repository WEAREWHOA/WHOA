const SUBMISSIONS = [
  { id: "1", name: "WHOA Flame Tee — Festival Edition", category: "Apparel", status: "Approved" },
  { id: "2", name: 'Hand-poured Soy Candle, "Same Same"', category: "Handmade Goods", status: "Pending review" },
  { id: "3", name: "Zine: Same Same But Different", category: "Print", status: "Approved" },
];

export default function SsbdTab() {
  return (
    <div>
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        Preview — once vendor profiles are linked, you&apos;ll be able to submit and track what
        you&apos;re bringing to Same Same But Different right from here. Example submissions
        below.
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SUBMISSIONS.map((item) => (
          <div key={item.id} className="card-surface rounded-2xl border border-border p-5">
            <span className="text-flame-2 text-xs font-semibold tracking-wide uppercase">
              {item.category}
            </span>
            <h3 className="font-display mt-1 text-lg">{item.name}</h3>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                item.status === "Approved"
                  ? "bg-tier-icon text-background"
                  : "border border-border-strong text-muted"
              }`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
