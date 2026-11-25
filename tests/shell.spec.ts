import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffApi } from './support/staff-api';
test.beforeEach(async ({ page }) => { await mockStaffApi(page, { authenticated: true }); });
test('shell navigation, language, keyboard and confirmation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back');
  await page.keyboard.press('/');
  await expect(page.getByRole('textbox', { name: 'Search accounts, trips, payments and cases' })).toBeFocused();
  await page.getByRole('button', { name: 'Switch to Swahili' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sw');
  await page.getByRole('button', { name: 'Badili kwenda Kiingereza' }).click();
  await page.getByRole('button', { name: 'Preview confirmation', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Reason').fill('Fictional component verification only');
  await page.getByRole('checkbox').check();
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('No live action');
  await page.getByRole('link', { name: 'Accounts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This area is not connected yet.' })).toBeVisible();
});
test('shared playground and A28 have no serious accessibility violations', async ({ page }) => {
  for (const route of ['/', '/playground/states']) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  }
});
test('A01 shell chrome preserves reference geometry', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.sidebar')).toHaveCSS('width', '224px');
  await expect(page.locator('.topbar')).toHaveCSS('height', '80px');
  expect(await page.locator('.global-search').boundingBox()).toMatchObject({ x: 256, y: 18, width: 500, height: 44 });
  await expect(page.locator('.nav-item')).toHaveCount(14);
  expect(await page.locator('.sidebar-profile').boundingBox()).toMatchObject({ x: 16, y: 848, width: 192, height: 66 });
});
test('mobile navigation is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Accounts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This area is not connected yet.' })).toBeVisible();
});
