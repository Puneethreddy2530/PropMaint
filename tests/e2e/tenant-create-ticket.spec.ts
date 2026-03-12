import { test, expect } from "@playwright/test";
import { quickLogin } from "./helpers";

test("tenant can create a ticket", async ({ page }) => {
  await quickLogin(page, "tenant");

  await page.goto("/tickets/new");

  await page.getByTestId("ticket-property-select").click();
  await page.getByRole("option", { name: /Sunset Ridge Apartments/i }).click();

  await page.getByTestId("ticket-unit-select").click();
  await page.getByRole("option", { name: /A-201/i }).click();

  await page.getByTestId("ticket-next-step").click();

  await page.getByTestId("ticket-category-PLUMBING").click();
  await page.getByTestId("ticket-next-step").click();

  const title = `Leaky faucet ${Date.now()}`;
  await page.getByTestId("ticket-title-input").fill(title);
  await page.getByTestId("ticket-description-input").fill(
    "The kitchen faucet is dripping constantly and the handle feels loose."
  );

  await page.getByTestId("ticket-next-step").click();
  await page.getByTestId("ticket-submit").click();

  await page.waitForURL("**/tickets/**");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
