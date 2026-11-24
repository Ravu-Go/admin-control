import { test, expect } from '@playwright/test';
test('A01 chrome matches the private native design', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;left:224px;top:176px;width:1216px;height:788px;background:var(--color-light);z-index:9999';
    document.body.append(mask);
  });
  expect(await page.screenshot()).toMatchSnapshot('a01-chrome.png', { threshold: .22, maxDiffPixelRatio: .012 });
});
