import { logoutAction } from "@/lib/actions";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        Log out
      </button>
    </form>
  );
}
