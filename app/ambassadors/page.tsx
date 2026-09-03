import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Tiers from "@/components/landing/Tiers";
import PortalPreview from "@/components/landing/PortalPreview";
import Faq from "@/components/landing/Faq";
import ApplyCta from "@/components/landing/ApplyCta";

export const metadata: Metadata = {
  title: "Ambassador Program",
  description: "Join the WHOA ambassador program — give your people 15% off, and earn 10% commission on every sale.",
};

export default function AmbassadorsPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Tiers />
      <PortalPreview />
      <Faq />
      <ApplyCta />
    </>
  );
}
