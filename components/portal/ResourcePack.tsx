const captions = [
  "just copped my favorite WHOA piece — use my code for 15% off 🔥 [link in bio]",
  "wearing WHOA on repeat. my code gets you 15% off your first order, link's in my bio",
  "if you know, you know. 15% off with my code, always.",
];

export default function ResourcePack({ code }: { code: string }) {
  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">Captions &amp; resources</h3>
      <p className="mt-1 text-sm text-muted">
        Ready-to-post captions for your code. Swap in your own voice.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {captions.map((caption) => (
          <li
            key={caption}
            className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground/90"
          >
            {caption.replace("my code", code)}
          </li>
        ))}
      </ul>
    </div>
  );
}
