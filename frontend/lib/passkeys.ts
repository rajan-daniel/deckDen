import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiFetch, ApiError } from "./api";

type LoginResult = { access_token: string; token_type: string };

// Runs the full passkey sign-in ceremony and returns the access token.
// Establishing the session is the caller's job (see loginWithToken in auth-context).
export async function authenticateWithPasskey(email: string): Promise<string> {
  const options = await apiFetch<PublicKeyCredentialRequestOptionsJSON>(
    "/webauthn/login/options",
    { method: "POST", body: { email } }
  );

  const assertion = await startAuthentication({ optionsJSON: options });

  // apiFetch stringifies the body itself - pass the object, not a JSON string.
  const result = await apiFetch<LoginResult>("/webauthn/login/verify", {
    method: "POST",
    body: assertion,
  });

  return result.access_token;
}

export function passkeyErrorMessage(err: unknown): string {
  // The backend deliberately returns the same 401 for an unknown email, an
  // account with no passkeys, and a failed verification, so the UI can't (and
  // shouldn't) tell them apart. Its own text mentions a password, which is
  // misleading on this path, so use passkey-specific wording instead.
  if (err instanceof ApiError && err.status === 401) {
    return "We couldn't sign you in with a passkey. Check your email, or use your password.";
  }
  // 422 = the backend's own validation rejected the email as malformed.
  if (err instanceof ApiError && err.status === 422) {
    return "Enter a valid email address to sign in with a passkey.";
  }
  if (err instanceof Error && err.name === "NotAllowedError") {
    return "Passkey sign-in was cancelled or timed out. Try again when you're ready.";
  }
  return "Something went wrong signing in with a passkey. Please try again.";
}
