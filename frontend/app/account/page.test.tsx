import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const startRegistration = vi.fn();
let webauthnSupported = true;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: 1, username: "alice", email: "alice@example.com" },
    token: "session-token",
    isLoading: false,
    logout: vi.fn(),
  }),
}));
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, apiFetch: (...args: unknown[]) => apiFetch(...args) };
});
vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: () => webauthnSupported,
  startRegistration: (...args: unknown[]) => startRegistration(...args),
}));

import { ApiError } from "@/lib/api";
import AccountPage from "./page";

type Passkey = { id: number; device_label: string | null; created_at: string; last_used_at: string | null };

const older: Passkey = { id: 1, device_label: null, created_at: "2026-10-01T12:00:00Z", last_used_at: null };
const newer: Passkey = { id: 2, device_label: null, created_at: "2026-10-08T12:00:00Z", last_used_at: "2026-10-09T12:00:00Z" };

// The fake backend: the list endpoint returns whatever `passkeys` currently holds.
let passkeys: Passkey[];

function backend(overrides: Record<string, (opts: { body?: unknown; token?: string }) => unknown> = {}) {
  apiFetch.mockImplementation(async (path: string, opts: { method?: string; body?: unknown; token?: string } = {}) => {
    const key = `${opts.method ?? "GET"} ${path}`;
    if (overrides[key]) return overrides[key](opts);
    if (key === "GET /webauthn/credentials") return [...passkeys];
    throw new Error(`unexpected request: ${key}`);
  });
}

beforeEach(() => {
  apiFetch.mockReset();
  startRegistration.mockReset();
  webauthnSupported = true;
  passkeys = [];
});

describe("account page: passkey list", () => {
  it("lists each passkey with a date fallback label and its usage", async () => {
    passkeys = [newer, older];
    backend();
    render(<AccountPage />);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/Passkey added/);
    expect(items[0]).toHaveTextContent(/Last used/);
    expect(items[1]).toHaveTextContent(/Never used/);
    expect(apiFetch).toHaveBeenCalledWith("/webauthn/credentials", { token: "session-token" });
  });

  it("shows a friendly empty state", async () => {
    backend();
    render(<AccountPage />);

    expect(await screen.findByText(/haven't added a passkey yet/i)).toBeInTheDocument();
  });

  it("shows an error, and still offers Add, when the list can't be loaded", async () => {
    apiFetch.mockRejectedValue(new ApiError(500, "Server exploded"));
    render(<AccountPage />);

    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a passkey" })).toBeInTheDocument();
  });

  it("hides Add and explains why when the browser doesn't support passkeys", async () => {
    webauthnSupported = false;
    backend();
    render(<AccountPage />);

    expect(await screen.findByText(/doesn't support passkeys/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a passkey" })).not.toBeInTheDocument();
  });
});

describe("account page: adding a passkey", () => {
  it("runs options, then the device prompt, then verify, and shows the new passkey", async () => {
    const options = { challenge: "abc", rp: { id: "localhost" } };
    const attestation = { id: "new-cred", rawId: "new-cred", type: "public-key", response: {} };
    startRegistration.mockResolvedValue(attestation);
    backend({
      "POST /webauthn/register/options": () => options,
      "POST /webauthn/register/verify": () => {
        passkeys = [newer];
        return { status: "success" };
      },
    });
    render(<AccountPage />);
    await screen.findByText(/haven't added a passkey yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add a passkey" }));

    expect(await screen.findAllByRole("listitem")).toHaveLength(1);
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: options });

    const optionsCall = apiFetch.mock.calls.find(([p]) => p === "/webauthn/register/options")!;
    expect(optionsCall[1]).toEqual({ method: "POST", token: "session-token" });
    const verifyCall = apiFetch.mock.calls.find(([p]) => p === "/webauthn/register/verify")!;
    // The object itself, not a pre-stringified copy (apiFetch stringifies once).
    expect(verifyCall[1].body).toBe(attestation);
    expect(verifyCall[1].token).toBe("session-token");
  });

  it("explains a cancelled device prompt and never calls verify", async () => {
    const cancelled = new Error("cancelled");
    cancelled.name = "NotAllowedError";
    startRegistration.mockRejectedValue(cancelled);
    backend({ "POST /webauthn/register/options": () => ({ challenge: "abc" }) });
    render(<AccountPage />);
    await screen.findByText(/haven't added a passkey yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add a passkey" }));

    expect(await screen.findByText(/cancelled or timed out/i)).toBeInTheDocument();
    expect(apiFetch.mock.calls.some(([p]) => p === "/webauthn/register/verify")).toBe(false);
    expect(screen.getByRole("button", { name: "Add a passkey" })).toBeEnabled();
  });

  it("shows the server's message when verification is rejected", async () => {
    startRegistration.mockResolvedValue({ id: "x" });
    backend({
      "POST /webauthn/register/options": () => ({ challenge: "abc" }),
      "POST /webauthn/register/verify": () => {
        throw new ApiError(400, "Passkey registration failed.");
      },
    });
    render(<AccountPage />);
    await screen.findByText(/haven't added a passkey yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add a passkey" }));

    expect(await screen.findByText("Passkey registration failed.")).toBeInTheDocument();
  });
});

describe("account page: removing a passkey", () => {
  it("needs a second click, and Cancel backs out without deleting", async () => {
    passkeys = [older];
    backend();
    render(<AccountPage />);
    await screen.findAllByRole("listitem");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Confirm remove" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Confirm remove" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(apiFetch.mock.calls.some(([, o]) => o?.method === "DELETE")).toBe(false);
  });

  it("deletes the chosen passkey and drops only that row", async () => {
    passkeys = [newer, older];
    backend({
      "DELETE /webauthn/credentials/1": () => {
        passkeys = passkeys.filter((p) => p.id !== 1);
        return { message: "Passkey removed" };
      },
    });
    render(<AccountPage />);
    const items = await screen.findAllByRole("listitem");
    // Row 2 is `older` (id 1, "Never used"): remove that one.
    fireEvent.click(within(items[1]).getByRole("button", { name: "Remove" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm remove" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByRole("listitem")).toHaveTextContent(/Last used/);
    expect(apiFetch).toHaveBeenCalledWith("/webauthn/credentials/1", { method: "DELETE", token: "session-token" });
  });

  it("keeps the row and shows an error when the delete fails", async () => {
    passkeys = [older];
    backend({
      "DELETE /webauthn/credentials/1": () => {
        throw new ApiError(404, "Passkey not found");
      },
    });
    render(<AccountPage />);
    await screen.findAllByRole("listitem");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));

    expect(await screen.findByText("Passkey not found")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(/Never used/);
  });
});
