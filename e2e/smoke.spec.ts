import { test, expect } from '@playwright/test';

// End-to-end smoke of the core demo-mode journey:
// landing → dashboard → Quick Create Write → generate → asset appears in Library.
test('demo-mode write flow saves an asset to the library', async ({ page }) => {
  await page.goto('/');

  // Landing → dashboard
  await page.getByRole('button', { name: /open studio|enter/i }).first().click();
  await expect(page.getByRole('button', { name: 'Command Center' })).toBeVisible();

  // Quick Create → Write tool opens directly (deep-link fix)
  await page.getByRole('button', { name: /scripts, hooks/i }).click();
  await expect(page.getByRole('heading', { name: 'Write' })).toBeVisible();

  // Generate in demo mode
  await page.getByRole('textbox').first().fill('A short hook about desert camping');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('button', { name: /copy/i })).toBeVisible({ timeout: 20_000 });

  // Save to library
  await page.getByRole('button', { name: /save/i }).first().click();

  // Library shows the saved text asset
  await page.getByRole('button', { name: 'Asset Library' }).click();
  await expect(page.locator('span', { hasText: /^text$/ }).first()).toBeVisible();

  // Search finds it; a nonsense query hides it
  await page.getByRole('searchbox').fill('desert');
  await expect(page.locator('span', { hasText: /^text$/ }).first()).toBeVisible();
  await page.getByRole('searchbox').fill('zzz-no-match');
  await expect(page.getByText(/no assets match/i)).toBeVisible();
});
