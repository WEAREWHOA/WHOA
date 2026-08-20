import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Tiers from "@/components/landing/Tiers";
import PortalPreview from "@/components/landing/PortalPreview";
import Faq from "@/components/landing/Faq";
import ApplyCta from "@/components/landing/ApplyCta";

export default function Home() {
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
