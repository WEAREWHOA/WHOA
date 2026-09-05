import Link from "next/link";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

export const metadata: Metadata = {
  title: "Site Concept",
  description: "A map of how WHOA is built — every journey, front end and back end, spiraling out from the home page.",
};

interface ConceptNode {
  label: string;
  href: string;
  blurb: string;
}

// The real orbiting buttons on the standard home page (see
// components/home/OrbitField.tsx) — this arm mirrors that exact set, since
// it's the actual customer-facing map of the site today.
const FRONTEND_NODES: ConceptNode[] = [
  { label: "Shop The WHOADEGA", href: "/shop", blurb: "Square-powered storefront — browse, cart, checkout." },
  { label: "Music Collective", href: "/music-collective", blurb: "Meet the DJs & producers behind WHOA Wednesday." },
  { label: "Art Collective", href: "/art-collective", blurb: "Independent artists — shop their work directly." },
  { label: "Event Calendar", href: "/events", blurb: "Flyer archive, RSVP/tickets, and the live calendar." },
  { label: "Brand Ambassadors", href: "/ambassadors", blurb: "Referral program landing page — apply to join." },
  { label: "WHOA Games", href: "/games", blurb: "Snake, puzzle, graffiti wall, scavenger hunt & more." },
  { label: "Same Same But WHOA", href: "/same-same-but-whoa", blurb: "A psychedelic point-and-click adventure." },
  { label: "WHOA POS", href: "/pos", blurb: "The in-person register staff use at events & pop-ups." },
];

// The backend portal's own shape — one account model, tabs unlocked by
// permission (see the "Backend Portal & permissions" section of the
// README) — spiraling out the opposite way from the same home page.
const BACKEND_NODES: ConceptNode[] = [
  { label: "Login / Portal", href: "/login", blurb: "One account for every role — customer, artist, staff." },
  { label: "Customer Tab", href: "/login", blurb: "Real Square purchase history, matched by email." },
  { label: "Brand Ambassador Tab", href: "/apply", blurb: "Referral code, trackable links, payouts, commissions." },
  { label: "Art & Music Tabs", href: "/art-collective/apply", blurb: "Self-service profiles — bio, links, product submissions." },
  { label: "Event Sales Tab", href: "/sell-for-us", blurb: "Sell For Us crew — sign up to work events, see your schedule." },
  { label: "Admin Tools", href: "/login", blurb: "Events Admin & Art Admin — review and approve submissions." },
  { label: "Super Admin", href: "/login", blurb: "Grants every permission; the only way to unlock a tab." },
  { label: "Integrations", href: "/login", blurb: "Square (catalog & payments), Supabase (data), Resend (email)." },
];

const CENTER = 550;
const RADIUS_START = 95;
const RADIUS_STEP = 47;
const ANGLE_STEP = 40; // degrees
const START_ANGLE = -90; // straight up

function polarToCartesian(r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function nodePosition(index: number, direction: 1 | -1): { x: number; y: number; angle: number; r: number } {
  const i = index + 1; // index 0 is the node closest to center
  const angle = START_ANGLE + direction * i * ANGLE_STEP;
  const r = RADIUS_START + i * RADIUS_STEP;
  return { ...polarToCartesian(r, angle), angle, r };
}

function spiralPath(count: number, direction: 1 | -1): string {
  const segments: string[] = [];
  const samplesPerStep = 14;
  const totalSamples = count * samplesPerStep;
  for (let s = 0; s <= totalSamples; s++) {
    const t = s / samplesPerStep;
    const angle = START_ANGLE + direction * t * ANGLE_STEP;
    const r = RADIUS_START + t * RADIUS_STEP;
    const { x, y } = polarToCartesian(r, angle);
    segments.push(`${s === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return segments.join(" ");
}

function ArmLabel({ x, y, node, align }: { x: number; y: number; node: ConceptNode; align: "start" | "end" }) {
  const dx = align === "start" ? 40 : -40;
  return (
    <text
      x={x + dx}
      y={y + 5}
      textAnchor={align === "start" ? "start" : "end"}
      className="fill-current text-[15px] font-semibold tracking-wide uppercase"
      style={{ fill: "#f7f0e6" }}
    >
      {node.label}
    </text>
  );
}

export default function SiteConceptPage() {
  const frontendPath = spiralPath(FRONTEND_NODES.length, 1);
  const backendPath = spiralPath(BACKEND_NODES.length, -1);

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 max-w-2xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          How it&apos;s built
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Site Concept
        </h1>
        <p className="mt-4 text-sm text-white/70 sm:text-base">
          Everything spirals out from one home page — customer-facing journeys curl one way,
          the shared backend portal curls the other. One account model, one login, every side of
          WHOA connected underneath it.
        </p>
      </div>

      <div className="relative z-10 mt-4 flex w-full max-w-4xl items-center justify-center gap-4 text-xs font-semibold tracking-wide text-white/80 uppercase">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff8a29" }} />
          Frontend
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#b829ff" }} />
          Backend
        </span>
      </div>

      <div className="relative z-10 mt-6 w-full max-w-4xl">
        <svg viewBox="-260 -60 1620 1220" className="h-auto w-full" role="img" aria-label="Diagram of WHOA's site structure, spiraling out from the home page into frontend and backend journeys">
          <path d={frontendPath} fill="none" stroke="#ff8a29" strokeWidth={2.5} strokeOpacity={0.7} />
          <path d={backendPath} fill="none" stroke="#b829ff" strokeWidth={2.5} strokeOpacity={0.7} />

          {FRONTEND_NODES.map((node, i) => {
            const { x, y, angle } = nodePosition(i, 1);
            const align = Math.cos((angle * Math.PI) / 180) >= 0 ? "start" : "end";
            return (
              <g key={node.href + node.label}>
                <circle cx={x} cy={y} r={22} fill="#1a1006" stroke="#ff8a29" strokeWidth={2.5} />
                <text x={x} y={y + 5} textAnchor="middle" className="text-[13px] font-bold" style={{ fill: "#ff8a29" }}>
                  {i + 1}
                </text>
                <ArmLabel x={x} y={y} node={node} align={align} />
              </g>
            );
          })}

          {BACKEND_NODES.map((node, i) => {
            const { x, y, angle } = nodePosition(i, -1);
            const align = Math.cos((angle * Math.PI) / 180) >= 0 ? "start" : "end";
            return (
              <g key={node.href + node.label}>
                <circle cx={x} cy={y} r={22} fill="#150a1f" stroke="#b829ff" strokeWidth={2.5} />
                <text x={x} y={y + 5} textAnchor="middle" className="text-[13px] font-bold" style={{ fill: "#b829ff" }}>
                  {i + 1}
                </text>
                <ArmLabel x={x} y={y} node={node} align={align} />
              </g>
            );
          })}

          <circle cx={CENTER} cy={CENTER} r={62} fill="url(#homeGradient)" stroke="#f7f0e6" strokeWidth={2} />
          <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="font-display text-[20px]" style={{ fill: "#0a0806" }}>
            WHOA
          </text>
          <text x={CENTER} y={CENTER + 16} textAnchor="middle" className="text-[11px] font-semibold tracking-widest uppercase" style={{ fill: "#0a0806" }}>
            Home
          </text>

          <defs>
            <radialGradient id="homeGradient">
              <stop offset="0%" stopColor="#ffce29" />
              <stop offset="55%" stopColor="#ff7a00" />
              <stop offset="100%" stopColor="#ff2fb0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 mt-14 grid w-full max-w-4xl gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl tracking-wide" style={{ color: "#ff8a29" }}>
            Frontend journeys
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            {FRONTEND_NODES.map((node, i) => (
              <li key={node.href + node.label}>
                <Link href={node.href} className="card-surface group flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-flame-2/50">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "rgba(255,138,41,0.15)", color: "#ff8a29" }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{node.label}</span>
                    <span className="block text-xs text-muted">{node.blurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="font-display text-2xl tracking-wide" style={{ color: "#b829ff" }}>
            Backend journeys
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            {BACKEND_NODES.map((node, i) => (
              <li key={node.href + node.label}>
                <Link href={node.href} className="card-surface group flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-flame-2/50">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "rgba(184,41,255,0.15)", color: "#b829ff" }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{node.label}</span>
                    <span className="block text-xs text-muted">{node.blurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="card-surface relative z-10 mt-14 w-full max-w-4xl rounded-2xl border border-border p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-wide">How it fits together</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Every page — frontend or backend — is the same Next.js app talking to the same three
          outside services: <span className="text-foreground font-semibold">Square</span> holds the
          real product catalog, inventory, and takes payments (online and at the in-person register);{" "}
          <span className="text-foreground font-semibold">Supabase</span> is the database behind
          every account, permission, RSVP, and submission; <span className="text-foreground font-semibold">Resend</span> sends
          every confirmation and staff notification — including the one-click Approve/Decline
          buttons that let staff review an application right from their inbox.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The account model is what ties both spirals together: everyone — a customer, an
          ambassador, an artist, a musician, event sales crew, or a Super Admin — is the same kind
          of row in the same table, logged in through the same door. What&apos;s different is only
          which tabs a Super Admin has unlocked. Apply for something on the frontend (Brand
          Ambassador, Sell For Us, Art or Music Collective) and, once approved, the matching tab
          just appears the next time that account logs in.
        </p>
      </div>
    </section>
  );
}
