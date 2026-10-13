import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn(),
}));

import { startAuthentication } from "@simplewebauthn/browser";
import { ApiError } from "./api";
import { authenticateWithPasskey, passkeyErrorMessage } from "./passkeys";

const optionsFromServer = { challenge: "abc", rpId: "localhost", allowCredentials: [] };
const assertionFromBrowser = { id: "cred-id", rawId: "cred-id", type: "public-key", response: {} };

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  vi.mocked(startAuthentication).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authenticateWithPasskey", () => {
  it("fetches options, runs the browser ceremony, verifies, and returns the access token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson(optionsFromServer))
      .mockResolvedValueOnce(okJson({ access_token: "passkey-token", token_type: "bearer" }));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(startAuthentication).mockResolvedValue(assertionFromBrowser as never);

    const token = await authenticateWithPasskey("alice@example.com");

    expect(token).toBe("passkey-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [optionsUrl, optionsInit] = fetchMock.mock.calls[0];
    expect(String(optionsUrl)).toMatch(/\/webauthn\/login\/options$/);
    expect(JSON.parse(optionsInit.body)).toEqual({ email: "alice@example.com" });

    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: optionsFromServer });

    const [verifyUrl, verifyInit] = fetchMock.mock.calls[1];
    expect(String(verifyUrl)).toMatch(/\/webauthn\/login\/verify$/);
    // Guards the double-stringify bug: the body must be the assertion itself,
    // not a JSON string that has been JSON-encoded a second time.
    expect(JSON.parse(verifyInit.body)).toEqual(assertionFromBrowser);
  });

  it("does not start the browser ceremony when the options request is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Invalid email or password" }),
      })
    );

    await expect(authenticateWithPasskey("nobody@example.com")).rejects.toBeInstanceOf(ApiError);
    expect(startAuthentication).not.toHaveBeenCalled();
  });

  it("does not call verify when the user cancels the device prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okJson(optionsFromServer));
    vi.stubGlobal("fetch", fetchMock);
    const cancelled = new Error("The operation either timed out or was not allowed.");
    cancelled.name = "NotAllowedError";
    vi.mocked(startAuthentication).mockRejectedValue(cancelled);

    await expect(authenticateWithPasskey("alice@example.com")).rejects.toBe(cancelled);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("passkeyErrorMessage", () => {
  it("uses passkey wording for a 401, not the server's password-based text", () => {
    const message = passkeyErrorMessage(new ApiError(401, "Invalid email or password"));
    expect(message).toMatch(/couldn't sign you in with a passkey/i);
    expect(message).not.toMatch(/Invalid email or password/);
  });

  it("asks for a valid email when the backend rejects the address as malformed", () => {
    expect(passkeyErrorMessage(new ApiError(422, "value is not a valid email address"))).toMatch(
      /valid email/i
    );
  });

  it("explains a cancelled or timed-out prompt", () => {
    const err = new Error("cancelled");
    err.name = "NotAllowedError";
    expect(passkeyErrorMessage(err)).toMatch(/cancelled or timed out/i);
  });

  it("falls back to a generic message for anything else", () => {
    expect(passkeyErrorMessage(new ApiError(500, "boom"))).toMatch(/something went wrong/i);
    expect(passkeyErrorMessage("not even an Error")).toMatch(/something went wrong/i);
  });
});
