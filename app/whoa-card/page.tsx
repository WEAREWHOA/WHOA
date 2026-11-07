import type { Metadata } from "next";
import Link from "next/link";

import { redeemClaimAction } from "./actions";
import CardFace from "@/components/whoaCard/CardFace";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { walletForAccount } from "@/lib/wallet";
import { formatCents } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import { CARD_PRICE_CENTS, MEMBER_PERKS } from "@/lib/whoaPerks";

const TITLE = "WHOA Card";
const DESCRIPTION =
  "The WHOA card: store credit you can spend in the shop and at the register, topped up whenever " +
  "you like. Sold over the counter at the WHOADEGA.";

export const metadata: Metadata = {
  alternates: { canonical: "/whoa-card" },
  title: TITLE,
  description: DESCRIPTION,
};

/**
 * Where the QR on the metal card lands.
 *
 * Every card carries the same QR, so this page cannot assume anything
 * about who is holding it. It has to work for somebody who has just
 * bought one, somebody who already has credit, and somebody who found
 * a card on the floor, and it has to do all three without handing the
 * last one any money.
 *
 * Dynamic, not cached: it shows a balance.
 */
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  empty: "Enter the code from your receipt.",
  unknown: "We don't recognise that code. Check it against your receipt.",
  used: "That code has already been used.",
  expired: "That code has expired. Bring your receipt in and we'll sort it out.",
  frozen: "Your card is on hold. Get in touch and we'll look at it.",
  closed: "That card is closed.",
  failed: "That didn't go through. Try again.",
  server: "Something went wrong at our end. Try again in a minute.",
};

export default async function WhoaCardPage(props: PageProps<"/whoa-card">) {
  const params = await props.searchParams;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const accountCode = await getSessionAmbassadorCode();
  const credited = Number(first("credited") ?? "");
  const error = first("cardError");

  // Read, never created, on a page load. A card is opened by an action
  // somebody took, not by a crawler fetching the page.
  const card = accountCode
    ? await walletForAccount(accountCode).catch((err) => {
        console.error("Couldn't read the card for %s:", accountCode, err);
        return null;
      })
    : null;

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Store credit, held by us
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        WHOA <span className="text-flame">Card</span>
      </h1>
      <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start">
        <p className="max-w-xl flex-1 text-sm leading-relaxed text-muted">
          A metal card, sold over the counter at the WHOADEGA for{" "}
          <strong className="text-foreground">{formatCents(CARD_PRICE_CENTS)}</strong> while they
          last. The {formatCents(CARD_PRICE_CENTS)} goes straight onto your balance, so the card
          pays for itself, and the perks come with it. The credit lives on your account rather
          than on the card, so it cannot be lost with it.
        </p>
        <CardFace
          code={card?.creditCode}
          member={Boolean(card?.memberSince)}
          className="w-full shrink-0 sm:w-64"
        />
      </div>

      {/* ───── What they have, if anything ───── */}
      {card && (
        <div className="border-flame-2/40 bg-flame-2/10 mt-8 rounded-2xl border p-6">
          <p className="text-flame-3 text-xs font-semibold tracking-[0.18em] uppercase">
            Your balance
          </p>
          <p className="font-display mt-1 text-4xl">{formatCents(card.balanceCents)}</p>
          <p className="mt-3 text-sm text-muted">
            Your code is{" "}
            <span className="text-foreground font-mono font-semibold">{card.creditCode}</span>. Read
            it out at the register to spend.
          </p>
          <Link
            href="/portal/wallet"
            className="text-flame mt-4 inline-block text-sm font-semibold hover:underline"
          >
            See your wallet &rarr;
          </Link>
        </div>
      )}

      {/* ───── Redeeming ───── */}
      <div id="redeem" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl tracking-wide">
          {card ? "Add credit" : "Activate your card"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          When you buy a card we give you a code on your receipt. Enter it here and the credit lands
          on your account.
        </p>

        {Number.isFinite(credited) && credited > 0 && (
          <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-5 rounded-lg border px-4 py-3 text-sm">
            <strong className="font-semibold">{formatCents(credited)} added.</strong> It is on your
            card now.
          </p>
        )}
        {error && (
          <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-5 rounded-lg border px-4 py-3 text-sm">
            {ERRORS[error] ?? ERRORS.server}
          </p>
        )}

        {accountCode ? (
          <form action={redeemClaimAction} className="mt-5 flex flex-wrap items-center gap-3">
            <label className="flex-1">
              <span className="sr-only">The code from your receipt</span>
              <input
                name="code"
                required
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ABCD-2345"
                className="border-border-strong bg-surface-raised w-full min-w-0 rounded-lg border px-4 py-3 font-mono text-base tracking-widest uppercase outline-none focus:border-flame-2"
              />
            </label>
            <button type="submit" className="btn-flame rounded-full px-6 py-3 text-sm font-semibold">
              Add it
            </button>
          </form>
        ) : (
          // The one thing a stranger scanning the QR can do. No card is
          // opened and no credit exists until somebody is signed in,
          // which is what stops a photograph of the card being worth
          // anything.
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login?from=/whoa-card"
              className="btn-flame rounded-full px-6 py-3 text-sm font-semibold"
            >
              Log in to add it
            </Link>
            <Link
              href="/apply"
              className="border-border-strong hover:border-flame-2/60 rounded-full border px-6 py-3 text-sm font-semibold transition-colors"
            >
              Make an account
            </Link>
          </div>
        )}
      </div>

      {/* ───── What it gets you ───── */}
      <div className="mt-12">
        <h2 className="font-display text-2xl tracking-wide">What it gets you</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {MEMBER_PERKS.map((perk) => (
            <li key={perk.title} className="rounded-xl border border-border p-4">
              <p className="flex items-start gap-2 font-semibold">
                <span aria-hidden className="text-flame-2">★</span>
                {perk.title}
              </p>
              {perk.detail && <p className="mt-1 text-sm text-muted">{perk.detail}</p>}
            </li>
          ))}
        </ul>
      </div>

      {/* ───── How it works ───── */}
      <div className="mt-14">
        <h2 className="font-display text-2xl tracking-wide">How it works</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            ["Buy one in the shop", "Ten dollars over the counter at the WHOADEGA, while they last."],
            [
              "Enter the code on your receipt",
              "That is what puts the credit on your account. The card itself is just the way in.",
            ],
            [
              "Spend it, or top it up",
              "Read your code out at the register. Add more whenever you like; it does not expire.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="border-flame-2/50 text-flame-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm leading-relaxed text-muted">
          The credit is held by us, not by a card processor, so it is ours to honour and ours to put
          right if anything looks wrong.{" "}
          <Link href="/contact" className="text-flame hover:underline">
            Tell us
          </Link>{" "}
          and we will.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/whoa-card`,
            isPartOf: { "@type": "WebSite", name: "WHOA", url: SITE_URL },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
