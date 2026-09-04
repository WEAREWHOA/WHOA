import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionAmbassadorCode } from "@/lib/auth";

export default async function PortalPage(props: PageProps<"/portal">) {
  // The nav's "You" link always points here regardless of login state (it
  // can't know the code to link to directly) — so a signed-in visitor
  // needs to be bounced straight to their dashboard instead of seeing the
  // login form again, even though their session cookie is still valid.
  const sessionCode = await getSessionAmbassadorCode();
  if (sessionCode) {
    redirect(`/portal/${sessionCode}`);
  }

  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;

  return (
    <section className="bg-flame-radial flex flex-1 items-center justify-center px-6 py-20">
      <LoginForm from="/portal" error={error} />
    </section>
  );
}
