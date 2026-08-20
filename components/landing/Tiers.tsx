import { TIERS } from "@/lib/tiers";

export default function Tiers() {
  return (
    <section id="tiers" className="border-t border-border py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
          Every tier earns <span className="text-flame">the same 10%</span>
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Tiers are built on orders sent, not on your commission rate. Climb
          for the perks and recognition — your cut stays flat the whole way
          up.
        </p>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.id} className="card-surface flex flex-col rounded-2xl p-8">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <h3 className="font-display text-2xl tracking-wide">{tier.label}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">
                {tier.minOrders === 0
                  ? "Starting tier — unlocked instantly"
                  : `Unlocked at ${tier.minOrders}+ orders`}
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-foreground/90">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-flame">+</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-border pt-4 text-sm">
                <span className="font-semibold text-foreground">10%</span>{" "}
                <span className="text-muted">commission, every sale</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
