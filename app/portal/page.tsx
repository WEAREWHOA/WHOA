import LoginForm from "@/components/LoginForm";

export default async function PortalPage(props: PageProps<"/portal">) {
  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;

  return (
    <section className="bg-flame-radial flex flex-1 items-center justify-center px-6 py-20">
      <LoginForm from="/portal" error={error} />
    </section>
  );
}
