const PURCHASES = [
  { id: "1", item: "WHOA Wednesday Tee — Black, M", date: "Jul 15, 2026", total: "$32.00", status: "Picked up" },
  { id: "2", item: "WHOADEGA Hoodie — Charcoal, L", date: "Jul 22, 2026", total: "$58.00", status: "Shipped" },
  { id: "3", item: "Sticker Pack (5)", date: "Aug 5, 2026", total: "$12.00", status: "Picked up" },
];

export default function CustomerTab() {
  return (
    <div>
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        Preview — this will show your real purchase history from the WHOADEGA POS once your
        account is linked to Square customer records. Example data below.
      </div>

      <div className="card-surface mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted uppercase">
            <tr>
              <th className="px-5 py-3 font-semibold">Item</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {PURCHASES.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">{p.item}</td>
                <td className="px-5 py-3 text-muted">{p.date}</td>
                <td className="px-5 py-3">{p.total}</td>
                <td className="px-5 py-3 text-muted">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
