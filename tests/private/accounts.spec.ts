import { test, expect } from '@playwright/test';
import { mockAccounts } from '../support/accounts-api';

test('A02/A03 visual review evidence stays in the private API workflow', async ({ page }, testInfo) => {
  await mockAccounts(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/accounts');
    await expect(page.getByRole('table')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const directory = testInfo.outputPath(`a02-accounts-${width}.png`);
    await page.screenshot({ path: directory, fullPage: true });
    await testInfo.attach(`A02-runtime-${width}`, { path: directory, contentType: 'image/png' });
    if (width === 1440) {
      const directoryBox = await page.locator('.account-directory').boundingBox();
      expect(directoryBox?.x).toBe(256);
      expect(Math.abs((directoryBox?.y ?? 0) - 268)).toBeLessThanOrEqual(24);
    }
    await page.goto('/accounts/14');
    await page.getByRole('button', { name: 'Suspend account…', exact: true }).click();
    await expect(page.getByLabel('Member-facing reason · EN · required')).toBeFocused();
    const review = testInfo.outputPath(`a03-review-${width}.png`);
    await page.screenshot({ path: review, fullPage: true });
    await testInfo.attach(`A03-runtime-${width}`, { path: review, contentType: 'image/png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
