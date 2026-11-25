import { test, expect } from '@playwright/test';
import { mockStaffApi } from '../support/staff-api';
import masks from './approved-differences.json' with { type: 'json' };
import tokens from '../../src/design/tokens.json' with { type: 'json' };
test('A01 chrome matches the private native design', async ({ page }) => {
  await mockStaffApi(page, { authenticated: true });
  await page.goto('/');
  await expect(page.locator('.sidebar .ravu-logo')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ masks, colors }) => {
    for (const area of masks) {
      const mask = document.createElement('div');
      Object.assign(mask.style, { position: 'fixed', left: `${area.x}px`, top: `${area.y}px`, width: `${area.width}px`, height: `${area.height}px`, background: colors[area.color as keyof typeof colors], zIndex: '9999' });
      document.body.append(mask);
    }
  }, { masks, colors: tokens.colors });
  expect(await page.screenshot()).toMatchSnapshot('a01-chrome.png', { threshold: .22, maxDiffPixelRatio: .012 });
});

test('branded login desktop and mobile review', async ({ page }, testInfo) => {
  await mockStaffApi(page);
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to Ravu' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const screenshotPath = testInfo.outputPath('login-' + viewport.width + '.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach('login-' + viewport.width, { path: screenshotPath, contentType: 'image/png' });
  }
});
