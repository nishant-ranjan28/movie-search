import { expect, test } from "@playwright/test";

test("can add to watchlist from Today and see it on /watchlist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /trending movies/i })).toBeVisible({ timeout: 10_000 });
  // Click the bookmark on the first movie card
  await page.getByRole("button", { name: /add to watchlist/i }).first().click();
  await page.goto("/watchlist");
  await expect(page.getByRole("heading", { level: 1, name: /watchlist/i })).toBeVisible();
  await expect(page.getByText(/1 item/)).toBeVisible();
});

test("empty state when nothing watchlisted", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page.getByRole("heading", { name: /your watchlist is empty/i })).toBeVisible();
});
