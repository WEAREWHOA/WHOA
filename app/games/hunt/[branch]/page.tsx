import { notFound } from "next/navigation";
import type { Metadata } from "next";
import HuntFoundCard from "@/components/games/hunt/HuntFoundCard";
import { HUNT_BRANCHES } from "@/lib/games/scavengerHunt";

export async function generateMetadata(
  props: PageProps<"/games/hunt/[branch]">,
): Promise<Metadata> {
  const { branch: slug } = await props.params;
  const branch = HUNT_BRANCHES.find((b) => b.slug === slug);
  if (!branch) return {};
  return { title: `Found: ${branch.label}` };
}

export default async function HuntBranchPage(props: PageProps<"/games/hunt/[branch]">) {
  const { branch: slug } = await props.params;
  const branch = HUNT_BRANCHES.find((b) => b.slug === slug);
  if (!branch) notFound();

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16">
      <HuntFoundCard branch={branch} />
    </section>
  );
}
