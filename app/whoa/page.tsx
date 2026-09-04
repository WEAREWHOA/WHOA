import type { Metadata } from "next";
import ComingSoon from "@/components/home/ComingSoon";

export const metadata: Metadata = {
  title: "WHOA",
  description: "Something's coming from WHOA — stay tuned.",
};

export default function WhoaPage() {
  return <ComingSoon title="WHOA" accent="#ffffff" />;
}
