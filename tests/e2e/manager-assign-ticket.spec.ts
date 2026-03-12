import { test, expect } from "@playwright/test";
import { quickLogin } from "./helpers";

test("manager can assign a ticket", async ({ page }) => {
  await quickLogin(page, "manager");

  await page.goto("/tickets");
  await page.getByRole("link", { name: /Ant infestation in bathroom/i }).click();
  await expect(page.getByRole("heading", { name: /Ant infestation in bathroom/i })).toBeVisible();

  await page.getByTestId("assign-staff-select").click();
  await page.getByRole("option", { name: /James Rodriguez/i }).click();
  await page.getByTestId("assign-staff").click();

  await expect(page.getByText("James Rodriguez")).toBeVisible();
});
