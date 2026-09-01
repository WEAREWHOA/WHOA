import QRCode from "qrcode";
import { getSiteOrigin } from "@/lib/site";
import { HUNT_BRANCHES } from "@/lib/games/scavengerHunt";

// Staff-only printable sheet — not linked from the public hunt page. Real,
// scannable QR codes (not a placeholder), generated server-side so this
// works with zero client-side dependencies. Print this, cut it up, hide
// the six pieces around the space.
export default async function HuntPrintPage() {
  const origin = await getSiteOrigin();

  const codes = await Promise.all(
    HUNT_BRANCHES.map(async (branch) => ({
      branch,
      url: `${origin}/games/hunt/${branch.slug}`,
      dataUrl: await QRCode.toDataURL(`${origin}/games/hunt/${branch.slug}`, {
        margin: 1,
        width: 320,
      }),
    })),
  );

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16 print:py-0">
      <div className="print:hidden">
        <h1 className="font-display text-3xl tracking-wide">Scavenger Hunt — Print Sheet</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Six real, scannable QR codes — one per branch. Print this page, cut out each card, and
          hide them around the space. Each one links straight to that branch&apos;s &ldquo;found&rdquo; page.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 print:mt-0 print:gap-4">
        {codes.map(({ branch, url, dataUrl }) => (
          <div
            key={branch.slug}
            className="flex flex-col items-center rounded-2xl border border-border-strong bg-white p-4 text-center print:break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={`QR code for ${branch.label}`} className="h-auto w-full" />
            <p className="mt-2 text-sm font-semibold text-black">{branch.label}</p>
            <p className="mt-1 text-[0.65rem] break-all text-neutral-500">{url}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
