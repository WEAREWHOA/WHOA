import { changePasswordAction, deleteAccountAction, updateAccountInfoAction } from "@/lib/actions";
import type { Ambassador } from "@/lib/types";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Name is required.",
  email: "Enter a valid email.",
  "email-taken": "That email is already in use by another account.",
  "weak-password": "New password must be at least 8 characters.",
  "password-mismatch": "New password and confirmation don't match.",
  "wrong-password": "That password is incorrect.",
  server: "Something went wrong on our end — try again in a moment.",
};

export default function SettingsTab({
  account,
  settingsSaved,
  passwordChanged,
  settingsError,
}: {
  account: Ambassador;
  settingsSaved: boolean;
  passwordChanged: boolean;
  settingsError?: string;
}) {
  const errorMessage = settingsError ? (ERROR_MESSAGES[settingsError] ?? ERROR_MESSAGES.server) : null;

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {errorMessage}
        </p>
      )}

      <div className="card-surface rounded-xl p-6">
        <h3 className="font-semibold">Profile info</h3>
        <p className="mt-1 text-sm text-muted">Your name, email, and Instagram handle on file.</p>

        {settingsSaved && (
          <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
            Profile updated.
          </p>
        )}

        <form action={updateAccountInfoAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="code" value={account.code} />

          <div>
            <label htmlFor="settings-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="settings-name"
              name="name"
              type="text"
              required
              defaultValue={account.name}
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="settings-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="settings-email"
              name="email"
              type="email"
              required
              defaultValue={account.email}
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="settings-instagram" className="text-sm font-medium">
              Instagram <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="settings-instagram"
              name="instagram"
              type="text"
              placeholder="@yourhandle"
              defaultValue={account.instagram ?? ""}
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="card-surface rounded-xl p-6">
        <h3 className="font-semibold">Change password</h3>
        <p className="mt-1 text-sm text-muted">Enter your current password to set a new one.</p>

        {passwordChanged && (
          <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
            Password updated.
          </p>
        )}

        <form action={changePasswordAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="code" value={account.code} />

          <div>
            <label htmlFor="settings-current-password" className="text-sm font-medium">
              Current password
            </label>
            <input
              id="settings-current-password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="settings-new-password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="settings-new-password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="settings-confirm-password" className="text-sm font-medium">
              Confirm new password
            </label>
            <input
              id="settings-confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
          >
            Update password
          </button>
        </form>
      </div>

      <div className="card-surface border-flame-1/40 rounded-xl border p-6">
        <h3 className="text-flame-3 font-semibold">Delete account</h3>
        <p className="mt-1 text-sm text-muted">
          Deactivates your login — you won&apos;t be able to sign back in. This does not erase your order history,
          referral links, or past RSVPs/tickets, which stay on file. Enter your password to confirm.
        </p>

        <form action={deleteAccountAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="code" value={account.code} />

          <div>
            <label htmlFor="settings-delete-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="settings-delete-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full max-w-sm rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <button
            type="submit"
            className="border-flame-1 text-flame-3 hover:bg-flame-1/10 self-start rounded-full border px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Delete my account
          </button>
        </form>
      </div>
    </div>
  );
}
