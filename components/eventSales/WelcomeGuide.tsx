import Link from "next/link";

const WHOA_WAY = [
  {
    title: "Make people feel welcome",
    body: "Say hi. Smile. Acknowledge people. Give them space if they want to explore on their own. If they look curious, invite them in. Read the room.",
  },
  {
    title: "Don't be pushy",
    body: "We're not here to pressure people into buying something. Invite. Don't convince. The experience comes first.",
  },
  {
    title: "Keep it weird",
    body: "Be playful. Be spontaneous. Have fun. Don't be afraid of the unexpected. Some of the best event moments are the ones nobody planned.",
  },
  {
    title: "Get people involved",
    body: "Whenever possible, invite people to participate. Make something. Write something. Wear something. Take a photo. Meet someone. Do something unexpected. Participation creates memories.",
  },
  {
    title: "Help each other",
    body: "If you see something that needs to be done, do it. If a teammate needs help, jump in. If something is broken, missing, or running low, say something. Nobody is above the work, and nobody has to do it alone.",
  },
];

const FEELINGS = [
  { feeling: "Curious", quote: "What's this place?" },
  { feeling: "Welcome", quote: "These people are cool." },
  { feeling: "Surprised", quote: "I didn't expect that." },
  { feeling: "Creative", quote: "I want to do something." },
  { feeling: "Connected", quote: "I just met somebody awesome." },
  { feeling: "Inspired", quote: "I have an idea." },
  { feeling: "Happy", quote: "That was fun." },
];

const SPACE_TASKS = [
  "Straighten merchandise",
  "Put things back where they belong",
  "Pick up trash",
  "Organize supplies",
  "Restock what is running low",
  "Make sure activities are ready",
  "Ask if anyone needs help",
];

export default function WelcomeGuide() {
  return (
    <div className="text-left">
      <Link href="/portal" className="text-sm text-muted hover:text-foreground">
        ← Back to portal
      </Link>

      <div className="bg-flame-radial relative mt-6 overflow-hidden rounded-3xl border border-border px-6 py-14 text-center sm:px-12">
        <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">
          Welcome Guide
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide sm:text-6xl">
          Welcome to the
          <br />
          WHOA Events Crew
        </h1>
        <p className="mt-4 text-sm font-semibold tracking-wide text-muted uppercase">
          Your guide to selling and hosting at any WHOA event or festival
        </p>

        <div className="mx-auto mt-8 max-w-2xl space-y-4 text-base text-foreground/90">
          <p className="font-display text-2xl tracking-wide">Welcome to the team.</p>
          <p>
            You are officially part of the crew that brings WHOA to life out in the world —
            WHOA Wednesday, WHOADEGA pop ups, and every festival we show up to — and turns a
            booth, table, or gallery into something bigger.
          </p>
          <p className="text-flame font-display text-2xl tracking-wide">
            WHOA is what we bring. The experience is what we create.
          </p>
          <p>
            Wherever we&apos;re set up, we&apos;re creating a space where people can wander in,
            take a breath, discover something, meet someone, play, express themselves, or simply
            enjoy being part of something unexpected.
          </p>
          <p>
            Our job isn&apos;t just to sell.
            <br />
            <span className="font-semibold text-foreground">
              We&apos;re here to create moments people remember.
            </span>
          </p>
        </div>
      </div>

      <section className="mt-14">
        <span className="text-flame-2 text-xs font-semibold tracking-[0.3em] uppercase">
          Your role
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          You&apos;re part of the experience
        </h2>
        <div className="mt-4 max-w-2xl space-y-4 text-sm text-foreground/90 sm:text-base">
          <p>Whatever event you&apos;re working, you are not just working a shift.</p>
          <p className="text-foreground font-semibold">You are part of the experience.</p>
          <p>
            You are a host, a guide, a salesperson, a friendly face, and sometimes the person who
            makes someone feel comfortable enough to stop and check us out.
          </p>
          <p>
            You don&apos;t need to perform. You don&apos;t need to force conversations. Just be
            present, helpful, aware, and yourself.
            <br />
            <span className="text-flame-2 font-semibold">Good energy is contagious.</span>
          </p>
        </div>
      </section>

      <section className="mt-14">
        <span className="text-flame-2 text-xs font-semibold tracking-[0.3em] uppercase">
          How we operate
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">The WHOA Way</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {WHOA_WAY.map((item, i) => (
            <div key={item.title} className="card-surface rounded-2xl border border-border p-6">
              <span className="text-flame font-display text-3xl">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display mt-2 text-xl tracking-wide">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <span className="text-flame-2 text-xs font-semibold tracking-[0.3em] uppercase">
          The goal
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          What we want people to feel
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FEELINGS.map((f) => (
            <div key={f.feeling} className="card-surface rounded-2xl border border-border p-5 text-center">
              <p className="text-flame font-display text-xl tracking-wide">{f.feeling}</p>
              <p className="mt-2 text-xs text-muted">&ldquo;{f.quote}&rdquo;</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">That&apos;s the goal.</p>
      </section>

      <section className="mt-14">
        <span className="text-flame-2 text-xs font-semibold tracking-[0.3em] uppercase">
          Day to day
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          Taking care of the space
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-foreground/90 sm:text-base">
          Our booth or table should feel intentional, even when things get busy. If you have
          downtime:
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SPACE_TASKS.map((task) => (
            <li
              key={task}
              className="card-surface flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-foreground/90"
            >
              <span className="text-flame-2" aria-hidden>
                ✦
              </span>
              {task}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Don&apos;t wait for small problems to become big ones.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card-surface rounded-2xl border border-border p-6">
            <h3 className="font-display text-xl tracking-wide">When it&apos;s busy</h3>
            <p className="mt-2 text-sm text-muted">
              Don&apos;t panic. Prioritize. Communicate. Help each other. Acknowledge people who
              are waiting and let them know you&apos;ll be with them soon. We don&apos;t need
              perfection. We need teamwork.
            </p>
          </div>
          <div className="card-surface rounded-2xl border border-border p-6">
            <h3 className="font-display text-xl tracking-wide">When it&apos;s slow</h3>
            <p className="mt-2 text-sm text-muted">
              Don&apos;t disappear into your phone. Create energy. Talk to someone walking by.
              Straighten up the space. Invite someone in. Energy attracts energy.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <span className="text-flame-2 text-xs font-semibold tracking-[0.3em] uppercase">
          Look out for each other
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          Take care of yourself and each other
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-foreground/90 sm:text-base">
          Events and festivals are fun, but they&apos;re also exhausting. Drink water. Eat. Take
          your breaks. Wear sunscreen. Get some sleep. Look out for your teammates too. We&apos;re
          building this together, so be patient with each other and communicate when you need
          help.
        </p>
      </section>

      <section className="border-flame-2/40 bg-flame-2/10 mt-14 rounded-3xl border p-8 text-center sm:p-12">
        <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">
          Our golden rule
        </span>
        <p className="mt-3 text-sm text-muted">When you&apos;re not sure what to do, ask yourself:</p>
        <p className="font-display mt-3 text-2xl tracking-wide sm:text-3xl">
          Does this make it better for the person in front of me?
        </p>
        <p className="mt-3 text-sm text-muted">
          If the answer is yes, you&apos;re probably heading in the right direction.
        </p>
      </section>

      <section className="mt-14 mb-16 text-center">
        <span className="text-flame-2 text-xs font-semibold tracking-[0.3em] uppercase">
          Final word
        </span>
        <div className="mx-auto mt-4 max-w-2xl space-y-4 text-sm text-foreground/90 sm:text-base">
          <p>
            Every event is something that only exists because we decided to show up and create it
            together.
          </p>
          <p>
            It might be a conversation. A sale. A new outfit. A photo. A laugh. A new friendship. A
            random moment someone remembers long after the event is over.
          </p>
          <p className="text-foreground font-semibold">
            You get to be part of making that happen.
          </p>
          <p>So have fun. Bring your personality. Be weird. Be kind. Be present.</p>
          <p className="text-flame font-display text-2xl tracking-wide">Make something happen.</p>
        </div>

        <p className="text-psychedelic font-display mt-8 text-3xl tracking-wide sm:text-5xl">
          LET&apos;S CREATE SOME SHIT
          <br />
          PEOPLE WILL NEVER FORGET.
        </p>
        <p className="text-flame font-display mt-4 text-4xl tracking-wide sm:text-6xl">WHOA.</p>
      </section>
    </div>
  );
}
