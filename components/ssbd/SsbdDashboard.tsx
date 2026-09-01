import Link from "next/link";
import {
  ACTIVATIONS,
  ANNOUNCEMENTS,
  DOCS,
  SCHEDULE_AREAS,
  TEAM_CONTACTS,
  TRAINING_POLICY,
  TRAINING_SESSIONS,
} from "@/lib/ssbd";

export default function SsbdDashboard() {
  return (
    <div className="text-left">
      <header>
        <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">Crew Hub</span>
        <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
          SSBD Admin
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Everything the WHOADEGA crew needs to build, sell, and work the booth at Same Same But
          Different — September 25–27, 2026, Lake Perris, CA.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-wide">Announcements</h2>
        <div className="mt-4 space-y-3">
          {ANNOUNCEMENTS.map((a) => {
            const content = (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg">{a.title}</h3>
                  {a.tag && (
                    <span className="bg-flame rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-wide text-background uppercase">
                      {a.tag}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">{a.date}</p>
                <p className="mt-2 text-sm text-foreground/90">{a.body}</p>
                {a.href && (
                  <p className="text-flame-2 mt-3 text-xs font-semibold tracking-wide uppercase">
                    Read the full guide →
                  </p>
                )}
              </>
            );

            return a.href ? (
              <Link
                key={a.id}
                href={a.href}
                className="card-surface block rounded-2xl border border-border p-5 transition-colors hover:border-flame-2/50"
              >
                {content}
              </Link>
            ) : (
              <div key={a.id} className="card-surface rounded-2xl border border-border p-5">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section id="training-calendar" className="mt-12">
        <h2 className="font-display text-2xl tracking-wide">Training Calendar</h2>
        <p className="mt-2 text-sm text-muted">{TRAINING_POLICY.attendance}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TRAINING_SESSIONS.map((session) => (
            <div key={session.id} className="card-surface rounded-2xl border border-border p-5">
              <h3 className="font-display text-lg">{session.title}</h3>
              <p className="text-xs text-muted">
                {session.date} · {session.time}
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-foreground/80">
                {session.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="card-surface mt-4 rounded-2xl border border-flame-2/40 p-5">
          <p className="text-sm text-foreground/90">{TRAINING_POLICY.note}</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-wide">Documents & Resources</h2>
        <div className="mt-4 space-y-3">
          {DOCS.map((doc) => (
            <details key={doc.id} className="card-surface group rounded-2xl border border-border p-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <span className="text-flame-2 text-[0.65rem] font-semibold tracking-wide uppercase">
                    {doc.category}
                  </span>
                  <h3 className="font-display text-lg">{doc.title}</h3>
                  <p className="mt-1 text-sm text-muted">{doc.summary}</p>
                </div>
                <span className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-foreground/90">
                {doc.body.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-wide">Activations Schedule</h2>
        <p className="mt-2 text-sm text-muted">
          Extra activations happening at SSBD, beyond the booth — dates and times TBD.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {ACTIVATIONS.map((a) => (
            <div key={a.id} className="card-surface rounded-2xl border border-border p-5">
              <h3 className="font-display text-lg uppercase">{a.title}</h3>
              <p className="mt-1 text-xs text-muted">{a.date}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-wide">Shift Schedule</h2>
        <p className="mt-2 text-sm text-muted">
          One schedule, two areas — WHOADEGA and WHOA OASIS. Talk to your team lead if your shift
          needs to change.
        </p>
        <div className="mt-4 space-y-6">
          {SCHEDULE_AREAS.map((area) => (
            <div key={area.id} className="card-surface rounded-2xl border border-border p-5">
              <h3 className="font-display text-lg">{area.label}</h3>
              {area.shifts ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-flame-2 text-xs font-semibold tracking-wide uppercase">
                        <th className="pb-2 pr-4">Crew</th>
                        <th className="pb-2 pr-4">Friday</th>
                        <th className="pb-2 pr-4">Saturday</th>
                        <th className="pb-2">Sunday</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {area.shifts.map((shift) => (
                        <tr key={shift.name}>
                          <td className="py-2 pr-4 font-semibold">{shift.name}</td>
                          <td className="py-2 pr-4 text-foreground/80">{shift.friday}</td>
                          <td className="py-2 pr-4 text-foreground/80">{shift.saturday}</td>
                          <td className="py-2 text-foreground/80">{shift.sunday}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Schedule coming soon — check back here.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 mb-8">
        <h2 className="font-display text-2xl tracking-wide">Team Contacts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TEAM_CONTACTS.map((c) => (
            <div
              key={`${c.role}-${c.name ?? c.contact}`}
              className="card-surface rounded-2xl border border-border p-5"
            >
              <p className="text-flame-2 text-xs font-semibold tracking-wide uppercase">{c.role}</p>
              {c.name && <p className="font-display mt-1 text-lg">{c.name}</p>}
              <p className={`text-sm text-muted ${c.name ? "" : "mt-1"}`}>{c.contact}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
