import { expect, test } from "@playwright/test";

test("offline reload shows last cached Today shell", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /trending movies/i })).toBeVisible({ timeout: 10_000 });
  // Wait briefly for SW + cache populated
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  // The page should still render the shell — at minimum the bottom nav links
  await expect(page.getByRole("link", { name: /today/i })).toBeVisible();
  await context.setOffline(false);
});
