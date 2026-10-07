import Link from "next/link";

/**
 * One tile in the /about grid.
 *
 * Extracted because the six tiles were six copies of the same markup, and
 * "make them all the same size" is not a thing you can keep true by
 * copying class lists: the two that had grown a `sm:col-span-2` looked
 * deliberate right up until somebody saw all six together.
 *
 * Two rules do the sizing, and both have to be here rather than on the
 * grid:
 *
 *   `h-full` plus `flex-col`, because a grid row already stretches its
 *   items to equal height, but the CONTENT inside them does not stretch
 *   with it. Without this the box is the right height and everything in
 *   it is still bunched at the top.
 *
 *   `mt-auto` on the call to action, which eats whatever height is left
 *   over and pins the arrow to the bottom edge. That is what makes two
 *   tiles with a one-line and a three-line summary read as a pair
 *   instead of as a mistake.
 */
export default function AboutCard({
  href,
  title,
  children,
  cta,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="card-surface group flex h-full flex-col rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
    >
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
      <span className="text-flame mt-auto pt-4 inline-block text-xs font-semibold tracking-wide uppercase">
        {cta} →
      </span>
    </Link>
  );
}
