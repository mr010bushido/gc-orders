import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom has no modal dialog support. Mirror the browser behaviour the Sheet relies on:
// showModal/close toggle `open`, close fires `close`, Escape fires a cancelable `cancel` then closes.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  document.addEventListener("keydown", (event) => {
    const dialog = document.querySelector("dialog[open]") as HTMLDialogElement | null;
    if (event.key !== "Escape" || !dialog) return;
    if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) dialog.close();
  });
}
