import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./copy-link-button";

// jsdom has no clipboard, so each test gets a fake one.
const writeText = vi.fn();

function blockClipboard() {
  writeText.mockRejectedValue(new DOMException("Write permission denied.", "NotAllowedError"));
}

// Click the button, then let the clipboard promise settle.
async function clickCopy() {
  render(<CopyLinkButton />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  window.history.pushState({}, "", "/users/alice");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyLinkButton", () => {
  it("copies the page address and shows Copied", async () => {
    await clickCopy();

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/users/alice`);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("goes back to its normal label after two seconds", async () => {
    await clickCopy();

    // Still "Copied" a moment before the two seconds are up, back to normal right at two.
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("button", { name: "Copy profile link" })).toBeInTheDocument();
  });

  it("stays as it was when the clipboard is blocked", async () => {
    // A copy that isn't caught shows up as an unhandled rejection, which Node
    // reports a tick later, so this test needs the real clock to see it.
    vi.useRealTimers();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    blockClipboard();
    await clickCopy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", unhandled);

    // It did try to copy, nothing blew up, and nothing changed on screen.
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Copy profile link" })).toBeInTheDocument();
    expect(screen.queryByText("Copied")).toBeNull();
  });
});
