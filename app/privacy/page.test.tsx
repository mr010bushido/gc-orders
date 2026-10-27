import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { IMAGE_RETENTION_DAYS, ORDER_RETENTION_YEARS } from "@/lib/retention/constants";
import PrivacyPage from "./page";

it("shows shared retention periods and the no-marketing promise", () => {
  const page = renderToStaticMarkup(createElement(PrivacyPage));
  expect(page).toContain(`after ${IMAGE_RETENTION_DAYS} days`);
  expect(page).toContain(`after ${ORDER_RETENTION_YEARS} years`);
  expect(page).toContain("never for targeted marketing");
  expect(page).toContain("SMS and email providers");
});
