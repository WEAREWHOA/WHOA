import LoginForm from "@/components/LoginForm";
import { safeReturnTo } from "@/lib/returnTo";

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  const mode = params?.mode === "signup" ? "signup" : "login";
  // Where to go after signing in. Validated here as well as in the
  // action, so a hostile value never even reaches the markup.
  const next = safeReturnTo(params?.next, "/portal");

  return (
    <section className="bg-flame-radial flex flex-1 items-center justify-center px-6 py-20">
      <LoginForm from="/login" mode={mode} error={error} next={next} />
    </section>
  );
}
