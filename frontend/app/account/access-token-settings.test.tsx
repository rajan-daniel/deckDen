import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, apiFetch: (...args: unknown[]) => apiFetch(...args) };
});

import { ApiError } from "@/lib/api";
import { AccessTokenSettings } from "./access-token-settings";

type Row = {
  id: number;
  name: string;
  token_prefix: string;
  scope: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
};

const SECRET = "dd_pat_THE-SECRET-VALUE-shown-only-once-0123456789";

const used: Row = {
  id: 1,
  name: "Claude Desktop",
  token_prefix: "dd_pat_ab12",
  scope: "read",
  created_at: "2026-10-01T12:00:00Z",
  last_used_at: "2026-10-10T12:00:00Z",
  expires_at: "2099-01-01T00:00:00Z",
};
const unused: Row = { ...used, id: 2, name: "Work laptop", token_prefix: "dd_pat_cd34", last_used_at: null };
const expired: Row = { ...used, id: 3, name: "Old assistant", expires_at: "2020-01-01T00:00:00Z" };

let rows: Row[];

function backend(overrides: Record<string, (opts: { body?: unknown; token?: string }) => unknown> = {}) {
  apiFetch.mockImplementation(async (path: string, opts: { method?: string; body?: unknown; token?: string } = {}) => {
    const key = `${opts.method ?? "GET"} ${path}`;
    if (overrides[key]) return overrides[key](opts);
    if (key === "GET /me/tokens") return [...rows];
    throw new Error(`unexpected request: ${key}`);
  });
}

function created(id: number, name: string, secret = SECRET) {
  return { ...used, id, name, token_prefix: secret.slice(0, 11), last_used_at: null, token: secret };
}

function renderSection() {
  return render(<AccessTokenSettings token="session-token" />);
}

function nameInput() {
  return screen.getByLabelText("Assistant name");
}

function connectButton() {
  return screen.getByRole("button", { name: /connect an assistant|connecting/i });
}

async function connect(name = "Claude Desktop") {
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.click(connectButton());
  await screen.findByTestId("new-token");
}

beforeEach(() => {
  apiFetch.mockReset();
  rows = [];
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access tokens: the list", () => {
  it("shows each connected assistant with its prefix, usage, and expiry", async () => {
    rows = [used, unused];
    backend();
    renderSection();

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Claude Desktop");
    expect(items[0]).toHaveTextContent("dd_pat_ab12");
    expect(items[0]).toHaveTextContent(/Last used/);
    expect(items[0]).toHaveTextContent(/Expires if unused/);
    expect(items[1]).toHaveTextContent(/Never used/);
    expect(apiFetch).toHaveBeenCalledWith("/me/tokens", { token: "session-token" });
  });

  it("labels an expired token as expired", async () => {
    rows = [expired];
    backend();
    renderSection();

    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent(/Expired/);
    expect(item).not.toHaveTextContent(/Expires if unused/);
  });

  it("shows a friendly empty state", async () => {
    backend();
    renderSection();

    expect(await screen.findByText(/No assistants connected yet/i)).toBeInTheDocument();
  });

  it("shows an error, and still offers to connect, when the list can't be loaded", async () => {
    backend({
      "GET /me/tokens": () => {
        throw new ApiError(500, "Server exploded");
      },
    });
    renderSection();

    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
    expect(nameInput()).toBeInTheDocument();
  });

  it("says what an assistant can access before anything is connected", async () => {
    backend();
    renderSection();

    expect(screen.getByText(/including private ones/i)).toBeInTheDocument();
    expect(screen.getByText(/can't\s+change anything/i)).toBeInTheDocument();
    await screen.findByText(/No assistants connected yet/i);
  });
});

describe("access tokens: connecting an assistant", () => {
  it("won't connect without a real name", async () => {
    backend();
    renderSection();
    await screen.findByText(/No assistants connected yet/i);

    expect(connectButton()).toBeDisabled();
    fireEvent.change(nameInput(), { target: { value: "   " } });
    expect(connectButton()).toBeDisabled();
    fireEvent.change(nameInput(), { target: { value: "Claude" } });
    expect(connectButton()).toBeEnabled();
  });

  it("sends the trimmed name, shows the token once with a warning, and adds the row", async () => {
    backend({ "POST /me/tokens": () => created(7, "Claude Desktop") });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);

    await connect("  Claude Desktop  ");

    expect(apiFetch).toHaveBeenCalledWith("/me/tokens", {
      method: "POST",
      token: "session-token",
      body: { name: "Claude Desktop" },
    });
    expect(screen.getByTestId("new-token")).toHaveTextContent(SECRET);
    expect(screen.getByText(/won't be able to see it again/i)).toBeInTheDocument();
    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Claude Desktop");
    expect(row).toHaveTextContent(SECRET.slice(0, 11));
    // Only the short prefix is in the list; the full secret appears in one place.
    expect(row).not.toHaveTextContent(SECRET);
    expect(nameInput()).toHaveValue("");
  });

  it("never writes the token to localStorage or sessionStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    backend({ "POST /me/tokens": () => created(7, "Claude Desktop") });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);

    await connect();

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("loses the token for good once you leave and come back", async () => {
    backend({ "POST /me/tokens": () => created(7, "Claude Desktop") });
    const { unmount } = renderSection();
    await screen.findByText(/No assistants connected yet/i);
    await connect();
    rows = [created(7, "Claude Desktop")];

    unmount();
    renderSection();

    await screen.findByRole("listitem");
    expect(screen.queryByTestId("new-token")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(SECRET);
  });

  it("lets you dismiss the token", async () => {
    backend({ "POST /me/tokens": () => created(7, "Claude Desktop") });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);
    await connect();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByTestId("new-token")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("replaces the shown token when you connect a second assistant", async () => {
    const second = "dd_pat_SECOND-secret-abcdefghijklmnopqrstuvwx";
    let call = 0;
    backend({ "POST /me/tokens": () => (call++ === 0 ? created(7, "First") : created(8, "Second", second)) });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);
    await connect("First");

    fireEvent.change(nameInput(), { target: { value: "Second" } });
    fireEvent.click(connectButton());

    await waitFor(() => expect(screen.getByTestId("new-token")).toHaveTextContent(second));
    expect(document.body).not.toHaveTextContent(SECRET);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("copies the token to the clipboard and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    backend({ "POST /me/tokens": () => created(7, "Claude Desktop") });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);
    await connect();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(SECRET);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("tells you to copy by hand when the clipboard is unavailable", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    backend({ "POST /me/tokens": () => created(7, "Claude Desktop") });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);
    await connect();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByText(/copy it yourself/i)).toBeInTheDocument();
    // The token is still on screen to copy manually.
    expect(screen.getByTestId("new-token")).toHaveTextContent(SECRET);
  });

  it("shows the server's message, and no token, when connecting is refused", async () => {
    backend({
      "POST /me/tokens": () => {
        throw new ApiError(400, "You can have at most 10 connected assistants. Disconnect one first.");
      },
    });
    renderSection();
    await screen.findByText(/No assistants connected yet/i);

    fireEvent.change(nameInput(), { target: { value: "One too many" } });
    fireEvent.click(connectButton());

    expect(await screen.findByText(/at most 10 connected assistants/i)).toBeInTheDocument();
    expect(screen.queryByTestId("new-token")).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(connectButton()).toBeEnabled();
  });
});

describe("access tokens: disconnecting", () => {
  it("needs a second click, and Cancel backs out without deleting", async () => {
    rows = [used];
    backend();
    renderSection();
    await screen.findByRole("listitem");

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(screen.getByRole("button", { name: "Confirm disconnect" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Confirm disconnect" })).not.toBeInTheDocument();
    expect(apiFetch.mock.calls.some(([, o]) => o?.method === "DELETE")).toBe(false);
  });

  it("deletes the chosen token and drops only that row", async () => {
    rows = [used, unused];
    backend({
      "DELETE /me/tokens/2": () => {
        rows = rows.filter((r) => r.id !== 2);
        return { message: "Disconnected" };
      },
    });
    renderSection();
    const items = await screen.findAllByRole("listitem");

    fireEvent.click(within(items[1]).getByRole("button", { name: "Disconnect" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm disconnect" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByRole("listitem")).toHaveTextContent("Claude Desktop");
    expect(apiFetch).toHaveBeenCalledWith("/me/tokens/2", { method: "DELETE", token: "session-token" });
  });

  it("keeps the row and shows an error when the disconnect fails", async () => {
    rows = [used];
    backend({
      "DELETE /me/tokens/1": () => {
        throw new ApiError(404, "Token not found");
      },
    });
    renderSection();
    await screen.findByRole("listitem");

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm disconnect" }));

    expect(await screen.findByText("Token not found")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Claude Desktop");
  });
});
