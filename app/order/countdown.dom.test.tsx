import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { ExpiryCountdown } from "./countdown";

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

it("hydrates after a delay and immediately shows an expired countdown", async () => {
  const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  environment.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));
  const deadline = "2026-10-18T10:00:01Z";
  const container = document.createElement("div");
  container.innerHTML = renderToString(<ExpiryCountdown deadline={deadline} />);
  expect(container.textContent).toBe("Time to pay: Calculating…");
  document.body.append(container);
  vi.setSystemTime(new Date("2026-10-18T10:00:05Z"));
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, <ExpiryCountdown deadline={deadline} />); });
    expect(container.textContent).toBe("Time to pay: 0h 0m 0s");
    expect(error).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  } finally { error.mockRestore(); environment.IS_REACT_ACT_ENVIRONMENT = false; }
});
