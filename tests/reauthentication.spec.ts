import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffApi } from './support/staff-api';

test.beforeEach(async ({ page }) => { await mockStaffApi(page, { authenticated: true }); });
test('fictional identity preview validates, cancels, clears and sends no credentials', async ({ page }) => {
  const sent: string[] = []; page.on('request', request => { if (request.method() === 'POST') sent.push(request.url()); });
  await page.goto('/playground/reauthentication');
  await page.getByRole('button', { name: 'Preview identity verification' }).click();
  await page.getByLabel('Example password').fill('Fictional-password');
  await expect(page.getByLabel('Example authenticator code')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Preview identity verification' })).toBeFocused();
  await page.getByRole('button', { name: 'Preview identity verification' }).click(); await expect(page.getByLabel('Example password')).toHaveValue('');
  await page.getByRole('button', { name: 'Verify and continue' }).click(); await expect(page.getByRole('alert')).toHaveCount(1);
  await page.getByLabel('Example password').fill('Fictional-password'); await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('status')).toContainText('No live action');
  expect(sent).toEqual([]); expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Fictional-password');
});
test('identity preview supports Swahili and keyboard access without serious axe violations', async ({ page }) => {
  await page.goto('/playground/reauthentication'); await page.getByRole('button', { name: 'Switch to Swahili' }).click();
  await page.getByRole('button', { name: 'Onyesho la uthibitishaji wa utambulisho' }).click();
  await expect(page.getByLabel('Nenosiri la mfano')).toBeFocused();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});
