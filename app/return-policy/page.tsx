import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy",
  description: "WHOA's return & exchange policy — eligibility, process, and refunds.",
};

export default function ReturnPolicyPage() {
  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        The fine print
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">
        Return <span className="text-flame">Policy</span>
      </h1>

      <div className="card-surface mt-8 flex flex-col gap-6 rounded-2xl p-6 text-sm leading-relaxed text-muted sm:p-8">
        <div>
          <h2 className="font-display text-xl text-foreground">Eligibility</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Returns and exchanges are accepted for items in new, unused condition, with all
              original tags and packaging, received within 14 days of purchase.
            </li>
            <li>
              Customized or personalized items can&apos;t be returned unless there&apos;s a
              manufacturing error or product defect — please carefully review all personalization
              details before submitting your order.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">How to start a return or exchange</h2>
          <p className="mt-2">
            Email{" "}
            <a href="mailto:info@wearewhoa.com" className="text-flame font-medium hover:underline">
              info@wearewhoa.com
            </a>{" "}
            with your name, order number, and reason for return. We&apos;ll respond within 3
            business days with instructions on how to proceed.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Return shipping</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              For returns due to customer preference, the buyer is responsible for return shipping
              costs — a trackable shipping method is recommended.
            </li>
            <li>
              If the item is damaged, defective, or incorrect due to our error, a prepaid return
              label will be provided and shipping costs covered. Contact us within 5 days of
              receiving your item with photos of the issue.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Refund &amp; exchange process</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Once your returned item is received and inspected, a refund or exchange will be
              processed within 3 business days.
            </li>
            <li>
              Refunds are issued to the original payment method — depending on your bank, it may
              take 5-10 business days to reflect on your statement.
            </li>
            <li>If an exchange is selected, the new item ships promptly after processing the return.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Important notes</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Slight variations in color or design will occur due to the handmade nature of our
              products — this adds to their unique charm.
            </li>
            <li>
              If your item has been bleached, variations in color, hue, and tone are inherent to
              the process and will differ slightly from the images displayed. By purchasing a
              bleached item, you acknowledge and accept these potential variations.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Questions?</h2>
          <p className="mt-2">
            Reach us anytime at{" "}
            <a href="mailto:info@wearewhoa.com" className="text-flame font-medium hover:underline">
              info@wearewhoa.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
