import Link from "next/link";

import { formatCents } from "@/lib/money";
import { MEMBER_PERKS, CARD_PRICE_CENTS } from "@/lib/whoaPerks";
import { REASON_LABELS, type Wallet, type WalletMovement } from "@/lib/wallet";

/**
 * Store credit, and the membership that may sit on top of it.
 *
 * Two things in one tab because they are one thing to the person
 * holding them: everybody has a balance, and some people also have a
 * WHOA card. The tab says which, rather than hiding when they do not.
 */

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function joined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "long",
    year: "numeric",
  });
}

export default function WalletTab({
  wallet,
  movements,
}: {
  wallet: Wallet | null;
  movements: WalletMovement[];
}) {
  const member = Boolean(wallet?.memberSince);

  return (
    <div>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Wallet</span>
      <h3 className="font-display mt-1 text-2xl">Your balance</h3>

      {/* ───── The money ───── */}
      <div className="card-surface mt-5 rounded-2xl border border-border p-6">
        <p className="font-display text-5xl">{formatCents(wallet?.balanceCents ?? 0)}</p>

        {wallet ? (
          <>
            <p className="mt-3 text-sm text-muted">
              Your code is{" "}
              <span className="text-foreground font-mono font-semibold">{wallet.creditCode}</span>.
              Read it out at the register to spend.
            </p>
            {wallet.status === "frozen" && (
              <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
                This wallet is on hold, so nothing can be added or spent.{" "}
                <Link href="/contact" className="underline">
                  Get in touch
                </Link>{" "}
                and we will sort it out.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Nothing on it yet.{" "}
            <Link href="/whoa-card" className="text-flame hover:underline">
              Add credit
            </Link>{" "}
            with a code from the shop.
          </p>
        )}

        <Link
          href="/whoa-card"
          className="btn-flame mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          Add credit
        </Link>
      </div>

      {/* ───── The membership ───── */}
      {member ? (
        <div className="border-flame-2/40 bg-flame-2/10 mt-8 rounded-2xl border p-6">
          <p className="text-flame-3 text-xs font-semibold tracking-[0.18em] uppercase">
            WHOA Card holder
          </p>
          <p className="mt-1 text-sm text-muted">
            Since {joined(wallet!.memberSince!)}. Here is what it gets you.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {MEMBER_PERKS.map((perk) => (
              <li key={perk.title} className="flex gap-3">
                <span aria-hidden className="text-flame-2">
                  ★
                </span>
                <span>
                  <span className="font-semibold">{perk.title}</span>
                  {perk.detail && (
                    <span className="block text-sm text-muted">{perk.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // Not a member, so this is the pitch rather than the badge. In
        // the same place the badge would be, because somebody checking
        // their balance is exactly who should see it.
        <div className="mt-8 rounded-2xl border border-border p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
            Not a card holder yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The metal WHOA card is {formatCents(CARD_PRICE_CENTS)} over the counter at the
            WHOADEGA, while they last. It puts the {formatCents(CARD_PRICE_CENTS)} straight onto
            this balance and adds the perks.
          </p>
          <Link
            href="/whoa-card"
            className="text-flame mt-3 inline-block text-sm font-semibold hover:underline"
          >
            See what it gets you &rarr;
          </Link>
        </div>
      )}

      {/* ───── Every movement ───── */}
      <h4 className="mt-10 font-semibold">Every movement</h4>
      <p className="mt-1 text-sm text-muted">
        Your whole statement. This is the record, so if a number ever looks wrong this is what we
        check it against.
      </p>

      {movements.length === 0 ? (
        <p className="an-empty">Nothing has moved yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {movements.map((m) => (
            <li key={m.id} className="flex items-start gap-3 p-3">
              <span
                className={`font-display w-20 shrink-0 text-right text-lg ${
                  m.deltaCents < 0 ? "text-flame-3" : "text-flame-2"
                }`}
              >
                {m.deltaCents > 0 ? "+" : "−"}
                {formatCents(Math.abs(m.deltaCents))}
              </span>
              <div className="min-w-0">
                <p className="text-sm">{REASON_LABELS[m.reason]}</p>
                <p className="text-xs text-muted">
                  {[
                    `left ${formatCents(m.balanceAfterCents)}`,
                    when(m.createdAt),
                    m.reference,
                    m.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
