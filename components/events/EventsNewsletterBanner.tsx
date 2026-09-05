"use client";

import { useState } from "react";
import NewsletterSignupModal from "@/components/events/NewsletterSignupModal";

export default function EventsNewsletterBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative z-10 mt-8 flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-white/20 bg-black/40 p-5 text-center backdrop-blur-sm">
        <p className="text-xs font-semibold tracking-wide text-white uppercase sm:text-sm">
          Sign up for our weekly event newsletter to stay in the loop on the WHOAdega, SH!FT & WHOA events
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-flame rounded-full px-8 py-2.5 text-sm font-semibold tracking-wide uppercase"
        >
          Sign Up
        </button>
      </div>

      {/* Rendered outside the banner box on purpose — that box has
          backdrop-blur-sm, and a backdrop-filter ancestor creates a new
          containing block for position:fixed descendants (same category as
          transform/filter), which would trap this modal inside the banner's
          own bounds instead of the viewport. */}
      {open && <NewsletterSignupModal onClose={() => setOpen(false)} />}
    </>
  );
}
