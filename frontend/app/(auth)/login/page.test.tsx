import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const login = vi.fn();
const loginWithToken = vi.fn();
const authenticateWithPasskey = vi.fn();
let webauthnSupported = true;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ login, loginWithToken }) }));
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => webauthnSupported }));
vi.mock("@/lib/passkeys", async () => {
  const actual = await vi.importActual<typeof import("@/lib/passkeys")>("@/lib/passkeys");
  return { ...actual, authenticateWithPasskey: (email: string) => authenticateWithPasskey(email) };
});

import { ApiError } from "@/lib/api";
import LoginPage from "./page";

beforeEach(() => {
  push.mockReset();
  login.mockReset();
  loginWithToken.mockReset();
  authenticateWithPasskey.mockReset();
  webauthnSupported = true;
});

function typeEmail(value: string) {
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value } });
}

describe("LoginPage passkey sign-in", () => {
  it("keeps the passkey button disabled until an email is entered", () => {
    render(<LoginPage />);
    const button = screen.getByRole("button", { name: "Sign in with a passkey" });
    expect(button).toBeDisabled();

    typeEmail("alice@example.com");
    expect(button).toBeEnabled();
  });

  it("signs in with the passkey token and goes home, without touching password login", async () => {
    authenticateWithPasskey.mockResolvedValue("passkey-token");
    loginWithToken.mockResolvedValue(undefined);
    render(<LoginPage />);

    typeEmail("alice@example.com");
    // No password typed: the button must not be blocked by the form's required field.
    fireEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(authenticateWithPasskey).toHaveBeenCalledWith("alice@example.com");
    expect(loginWithToken).toHaveBeenCalledWith("passkey-token");
    expect(login).not.toHaveBeenCalled();
  });

  it("shows passkey wording for a 401 and does not create a session", async () => {
    authenticateWithPasskey.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    render(<LoginPage />);

    typeEmail("nobody@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    expect(await screen.findByText(/couldn't sign you in with a passkey/i)).toBeInTheDocument();
    expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument();
    expect(loginWithToken).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("re-enables the button after a failure so the user can retry", async () => {
    authenticateWithPasskey.mockRejectedValue(new Error("boom"));
    render(<LoginPage />);

    typeEmail("alice@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    await screen.findByText(/something went wrong/i);
    expect(screen.getByRole("button", { name: "Sign in with a passkey" })).toBeEnabled();
  });

  it("hides the passkey option when the browser doesn't support WebAuthn", () => {
    webauthnSupported = false;
    render(<LoginPage />);

    expect(screen.queryByRole("button", { name: "Sign in with a passkey" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });
});

describe("LoginPage password sign-in (unchanged)", () => {
  it("still logs in with email and password and goes home", async () => {
    login.mockResolvedValue(undefined);
    render(<LoginPage />);

    typeEmail("alice@example.com");
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "hunter2222" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(login).toHaveBeenCalledWith("alice@example.com", "hunter2222");
    expect(authenticateWithPasskey).not.toHaveBeenCalled();
  });
});
