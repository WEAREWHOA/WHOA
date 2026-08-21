import LoginForm from "@/components/LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  const detail = typeof params?.detail === "string" ? params.detail : undefined;
  const mode = params?.mode === "signup" ? "signup" : "login";

  return (
    <section className="bg-flame-radial flex flex-1 items-center justify-center px-6 py-20">
      <LoginForm from="/login" mode={mode} error={error} detail={detail} />
    </section>
  );
}
