const steps = [
  {
    number: "01",
    title: "Apply",
    body: "Fill out a quick form with your name, email, and Instagram. Approval is instant — no waiting on a review team.",
  },
  {
    number: "02",
    title: "Get your code",
    body: "You'll get a personal code and a special link, ready to drop in your bio, stories, or DMs the second you're in.",
  },
  {
    number: "03",
    title: "Share it",
    body: "Anyone who uses your code or link gets 15% off their order. Your portal tracks every click and sale in real time.",
  },
  {
    number: "04",
    title: "Get paid",
    body: "You earn a flat 10% commission on every sale, at every tier. Payouts go straight to PayPal, Venmo, or your bank.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
          How it <span className="text-flame">works</span>
        </h2>
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number}>
              <div className="font-display text-3xl text-flame">{step.number}</div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
