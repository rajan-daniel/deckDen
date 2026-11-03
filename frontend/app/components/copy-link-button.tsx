"use client";

import { useState } from "react";
import { Icon } from "./icons";

// Copies the current page's address, so a player can share their profile.
export function CopyLinkButton({ label = "Copy profile link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (insecure context, denied permission).
      // Nothing useful to show, so leave the button as it was.
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="btn-secondary py-2 px-4">
      <Icon name={copied ? "check" : "link"} className="h-4 w-4" />
      {copied ? "Copied" : label}
    </button>
  );
}
