"use client";

import { useState } from "react";
import Link from "next/link";

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: "What is WHOA?",
    answer:
      "WHOA is a collector's fashion brand blending streetwear and art — one-of-a-kind bleached and hand-painted pieces, made by independent artists, not mass-produced.",
  },
  {
    question: "What is WHOADEGA?",
    answer:
      "WHOADEGA is WHOA's community hub in Ocean Beach, San Diego — part shop, part gallery, part event space, with weekly gatherings, live DJ sets, and art events from the WHOA collective.",
  },
  {
    question: "Are your pieces really one-of-a-kind?",
    answer:
      "Yes. Most WHOA apparel is individually hand-bleached or hand-painted, so no two pieces are exactly alike — expect natural variation in color, pattern, and finish from what's pictured.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "All major credit and debit cards, processed securely through Square.",
  },
  {
    question: "Do you ship internationally?",
    answer: "Not yet — online orders currently ship within the US only.",
  },
  {
    question: "How much does shipping cost, and how long does it take?",
    answer: (
      <>
        Shipping is currently free on every online order (a limited-time offer — rates will
        eventually be calculated by weight and order amount). Orders are typically processed in
        3-5 business days (2 weeks to 1 month for custom hand-painted designs), then arrive in
        another 5-7 business days within the continental US. Full details on the{" "}
        <Link href="/shipping-policy" className="text-flame font-medium hover:underline">
          Shipping Policy
        </Link>{" "}
        page.
      </>
    ),
  },
  {
    question: "What's your return policy?",
    answer: (
      <>
        Returns and exchanges are accepted within 14 days for items in new, unused condition with
        original tags. See the full{" "}
        <Link href="/return-policy" className="text-flame font-medium hover:underline">
          Return Policy
        </Link>{" "}
        for how to start one.
      </>
    ),
  },
  {
    question: "My bleached item looks a little different than the photo — is that normal?",
    answer:
      "Yes. Bleaching breaks down fabric dye in a way that's never perfectly repeatable, so color, hue, and tone will vary slightly piece to piece and from what's shown online — that's part of the charm, not a defect.",
  },
  {
    question: "How do I become a WHOA ambassador?",
    answer: (
      <>
        Apply on the{" "}
        <Link href="/apply" className="text-flame font-medium hover:underline">
          Apply
        </Link>{" "}
        page. Ambassadors get a personal referral link that gives their audience a discount and
        earns them a commission on resulting sales — details on the{" "}
        <Link href="/ambassadors" className="text-flame font-medium hover:underline">
          Ambassador Program
        </Link>{" "}
        page.
      </>
    ),
  },
  {
    question: "How do I get in touch?",
    answer: (
      <>
        Send a message through the{" "}
        <Link href="/contact" className="text-flame font-medium hover:underline">
          Contact
        </Link>{" "}
        page, email{" "}
        <a href="mailto:info@wearewhoa.com" className="text-flame font-medium hover:underline">
          info@wearewhoa.com
        </a>
        , call the store at (619) 630-9551, or DM{" "}
        <a
          href="https://instagram.com/wearewhoa.art"
          target="_blank"
          rel="noreferrer"
          className="text-flame font-medium hover:underline"
        >
          @wearewhoa.art
        </a>{" "}
        on Instagram.
      </>
    ),
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="card-surface flex flex-col divide-y divide-border rounded-2xl px-6 sm:px-8">
      {FAQS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question} className="py-5">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <span className="font-display text-lg tracking-wide text-foreground sm:text-xl">
                {item.question}
              </span>
              <span
                aria-hidden
                className={`text-flame shrink-0 text-2xl leading-none transition-transform duration-200 ${
                  open ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            {open && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
