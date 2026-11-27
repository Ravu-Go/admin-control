import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStaffApi } from './support/staff-api';
import { overviewFixture } from './support/overview-fixture';

async function setup(page: import('@playwright/test').Page) {
  await mockStaffApi(page, { authenticated: true, enabledFeatures: ['overview'] });
  const state = { status: 200, requests: [] as URL[] };
  await page.route('**/api/v1/admin/console/overview?*', async route => {
    state.requests.push(new URL(route.request().url()));
    return route.fulfill({ status: state.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true' },
      body: JSON.stringify(state.status === 200 ? { data: overviewFixture(), meta: { server_time: '2026-11-26T09:00:00Z', request_id: 'fixture-overview' } } : { error: 'unavailable' }) });
  });
  return state;
}

test('A01 renders scoped figures, EN/SW and URL filters without accessibility violations', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'User registrations', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Registered users', exact: true })).toContainText('12,500');
  await page.getByLabel('Operating area', { exact: true }).selectOption('1');
  await expect(page).toHaveURL(/area_id=1/);
  await expect.poll(() => state.requests.at(-1)?.searchParams.get('area_id')).toBe('1');
  await page.getByLabel('Account type', { exact: true }).selectOption('rider');
  await expect.poll(() => state.requests.at(-1)?.searchParams.get('audience')).toBe('rider');
  await page.getByRole('button', { name: /Switch to Swahili/ }).click();
  await expect(page.getByRole('heading', { name: 'Usajili wa watumiaji', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Badili kwenda Kiingereza/ }).click();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(value => value.impact === 'serious' || value.impact === 'critical')).toEqual([]);
});

test('refresh failures retain a labelled snapshot and revoked access hides the figures', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'User registrations', exact: true })).toBeVisible();
  state.status = 503;
  await page.getByRole('button', { name: 'Refresh overview', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('last successful snapshot');
  await expect(page.getByRole('region', { name: 'Registered users', exact: true })).toContainText('12,500');
  state.status = 403;
  await page.getByRole('button', { name: 'Refresh overview', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('do not have access');
  await expect(page.getByRole('region', { name: 'Registered users', exact: true })).toHaveCount(0);
});

test('A01 fits desktop and mobile without changing shell geometry', async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'User registrations', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.sidebar')).toHaveCSS('width', '224px');
  await page.screenshot({ path: testInfo.outputPath('overview-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Reporting period', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('overview-mobile.png'), fullPage: true });
});
