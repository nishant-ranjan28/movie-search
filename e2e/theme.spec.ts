import { expect, test } from "@playwright/test";

test("theme toggle persists across reload", async ({ page }) => {
  await page.goto("/");
  // Default is dark
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // Switch to light
  await page.getByRole("button", { name: /switch to light theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // Reload and confirm persistence
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
