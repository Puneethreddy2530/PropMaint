import type { Page } from "@playwright/test";

export async function quickLogin(page: Page, role: "tenant" | "manager" | "staff") {
  await page.goto("/login");
  await page.getByTestId(`login-${role}`).click();
  await page.waitForURL("**/dashboard");
}
