import { expect, test } from "@playwright/test";

test("loads Today page with Trending Movies rail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /trending movies/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /trending tv/i })).toBeVisible();
});

test("can navigate to a movie detail page from Today", async ({ page }) => {
  await page.goto("/");
  // Wait for Trending Movies rail to appear so cards are rendered.
  await expect(page.getByRole("heading", { name: /trending movies/i })).toBeVisible({ timeout: 10_000 });
  // Click the first MediaCard (role="button" with an aria-label set to the title).
  // We scope to cards by requiring an aria-label since the watchlist toggle is a <button>
  // (not role="button" Card element). The first card on Today is from a trending rail.
  const firstCard = page.locator('[role="button"][aria-label]').first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/(movies|tv)\/\d+/);
});
