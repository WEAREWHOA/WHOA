import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Received",
  description: "Your Music Collective application was submitted.",
};

export default function MusicCollectiveThankYouPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Application received
      </span>
      <h1 className="font-display mt-3 text-4xl tracking-wide sm:text-5xl">
        Thanks for <span className="text-flame">applying</span>
      </h1>
      <p className="mt-4 text-sm text-muted">
        We&apos;ve got your Music Collective application. Our team will review it and follow up by
        email — once approved, a Music tab unlocks in your portal where you can manage your bio
        and links any time.
      </p>
      <Link href="/music-collective" className="btn-flame mt-8 rounded-full px-8 py-4 text-base">
        See the collective
      </Link>
    </section>
  );
}
