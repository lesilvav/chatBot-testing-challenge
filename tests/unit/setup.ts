import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// `globals` is intentionally not enabled in vitest.config.ts, so
// @testing-library/react's auto-cleanup (which relies on a global
// `afterEach`) never registers on its own. Do it explicitly instead.
afterEach(() => {
  cleanup();
});
