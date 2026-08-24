import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response as Response));
}

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.username : "anonymous"}</div>
      <button onClick={() => login("alice@example.com", "hunter2222")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthProvider", () => {
  it("starts logged out with no stored token", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("anonymous"));
  });

  it("restores the session from a token already in localStorage", async () => {
    localStorage.setItem("token", "stored-token");
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ id: 1, username: "alice", email: "a@x.com" }) });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));
  });

  it("clears a stored token that the backend no longer accepts", async () => {
    localStorage.setItem("token", "stale-token");
    mockFetchOnce({ ok: false, status: 401, json: async () => ({ detail: "Invalid authentication token" }) });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("anonymous"));
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("logs in, stores the token, and loads the user", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "new-token", token_type: "bearer" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1, username: "alice", email: "a@x.com" }) });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("anonymous"));

    await act(async () => {
      screen.getByText("login").click();
    });

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));
    expect(localStorage.getItem("token")).toBe("new-token");
  });

  it("logout clears the token and the user", async () => {
    localStorage.setItem("token", "stored-token");
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ id: 1, username: "alice", email: "a@x.com" }) });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("alice"));

    act(() => {
      screen.getByText("logout").click();
    });

    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    expect(localStorage.getItem("token")).toBeNull();
  });
});
