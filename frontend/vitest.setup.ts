import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without test.globals enabled, Testing Library can't auto-detect the test
// runner to register its own cleanup - so each rendered component would
// otherwise stay mounted in jsdom's document and leak into the next test.
afterEach(() => {
  cleanup();
});
