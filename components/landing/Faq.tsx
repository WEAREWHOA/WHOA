const faqs = [
  {
    q: "How much do I earn?",
    a: "A flat 10% commission on every sale that comes through your code or link — at every tier. Tiers unlock perks and recognition, not a better rate.",
  },
  {
    q: "How much discount does my code give?",
    a: "15% off for anyone who checks out with your code or clicks your special link.",
  },
  {
    q: "How fast is approval?",
    a: "Instant. Submit the application and your code and link are generated immediately — no review queue.",
  },
  {
    q: "How do I get paid?",
    a: "Set your payout method — Venmo or Zelle, using the phone number on that account — from your portal. Commission is tracked per order as it comes in.",
  },
  {
    q: "How do tiers work?",
    a: "Rookie starts at 0 orders, Rising unlocks at 5, Icon at 20. Your portal shows a live progress bar toward the next tier.",
  },
  {
    q: "Do I need a certain follower count?",
    a: "No. The program is open to anyone who wants to share WHOA with their community.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="border-t border-border py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
          Questions, <span className="text-flame">answered</span>
        </h2>
        <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="font-semibold text-foreground">{faq.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
