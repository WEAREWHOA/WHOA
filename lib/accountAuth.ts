import { getByCode, getByEmail, getCredentialsByEmail, createAmbassador } from "./store";
import { createSession, getSessionAmbassadorCode, hashPassword, verifyPassword } from "./auth";

export interface AccountSummary {
  name: string;
  email: string;
}

// Shared by every flow with an inline "sign in or create an account with
// this email" bar (checkout, event RSVP/tickets) — returns who, if
// anyone, the current session belongs to, so a form can prefill
// name/email and skip the password field for a returning customer.
export async function getAccountSummary(): Promise<AccountSummary | null> {
  const code = await getSessionAmbassadorCode();
  if (!code) return null;
  const account = await getByCode(code);
  return account ? { name: account.name, email: account.email } : null;
}

export interface ResolveAccountResult {
  code: string | null;
  accountCreated: boolean;
  signedIn: boolean;
  error?: string;
}

// Signs the buyer into an existing account or creates a new one when a
// password is given, reusing the same email+password accounts as /login.
// Blank/omitted password, or already being signed in, is a no-op (guest).
// Shared between checkout and event RSVP/ticket purchases so the
// email-exists / wrong-password / too-short-password logic lives in one
// place instead of being copy-pasted per flow.
export async function resolveAccount(input: {
  name: string;
  email: string;
  password?: string;
}): Promise<ResolveAccountResult> {
  const alreadySignedIn = await getSessionAmbassadorCode();
  if (alreadySignedIn) return { code: alreadySignedIn, accountCreated: false, signedIn: false };

  if (!input.password) return { code: null, accountCreated: false, signedIn: false };

  const email = input.email.trim();
  const existingAccount = email ? await getByEmail(email) : undefined;

  if (existingAccount) {
    const credentials = await getCredentialsByEmail(email);
    const valid = credentials ? await verifyPassword(input.password, credentials.passwordHash) : false;
    if (!valid || !credentials) {
      return {
        code: null,
        accountCreated: false,
        signedIn: false,
        error: "An account already exists for this email — enter the correct password to sign in, or continue as a guest.",
      };
    }
    await createSession(credentials.code);
    return { code: credentials.code, accountCreated: false, signedIn: true };
  }

  if (input.password.length < 8) {
    return { code: null, accountCreated: false, signedIn: false, error: "Password must be at least 8 characters." };
  }

  const passwordHash = await hashPassword(input.password);
  const created = await createAmbassador({ name: input.name.trim(), email, passwordHash });
  await createSession(created.code);
  return { code: created.code, accountCreated: true, signedIn: false };
}
