import { test, expect, type Page } from '@playwright/test';
import { mockStaffApi } from './support/staff-api';
import { mockStaffManagement } from './support/staff-management-api';
import { mockSettings } from './support/settings-api';

const pages: { path: string; setup: (page: Page) => Promise<unknown>; heading: string }[] = [
  { path: '/administration/access', setup: page => mockStaffManagement(page), heading: 'Staff roles and permissions' },
  { path: '/administration/audit', setup: page => mockStaffApi(page, { authenticated: true, permissions: ['overview.read', 'audit.read', 'exports.create'] }), heading: 'Audit log' },
  { path: '/administration/settings', setup: page => mockSettings(page), heading: 'System settings and integrations' },
];

for (const { path, setup, heading } of pages) {
  test(`header rules on ${path}`, async ({ page }) => {
    await setup(page);
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    const header = page.locator('header.page-header');
    // One primary action per page, and it sits in the header.
    await expect(page.locator('main [data-variant="primary"]')).toHaveCount(1);
    await expect(header.locator('[data-variant="primary"]')).toHaveCount(1);
    // Tabs, when present, are real tabs with exactly one selected and no filled background.
    const tabs = page.getByRole('tab');
    if (await tabs.count()) {
      await expect(page.getByRole('tab', { selected: true })).toHaveCount(1);
      const background = await page.getByRole('tab', { selected: true }).evaluate(element => getComputedStyle(element).backgroundColor);
      expect(background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    }
    // Every header and toolbar control is 40px tall.
    for (const element of await header.locator('button').all()) expect(Math.round((await element.boundingBox())!.height)).toBe(40);
    // Red is reserved for SOS: no danger buttons on the page body.
    await expect(page.locator('main .button.danger')).toHaveCount(0);
  });
}

test('A24 tab drives the panel and survives a reload', async ({ page }) => {
  await mockSettings(page);
  await page.goto('/administration/settings?tab=integrations');
  await expect(page.getByRole('tab', { name: 'Integrations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Integration status');
  await expect(page.getByRole('tabpanel')).not.toContainText('Operational policies');
  await page.getByRole('tab', { name: 'Integrations' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Policies' })).toBeFocused();
  await expect(page).toHaveURL(/tab=policies/);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Policies' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Operational policies');
  await page.getByRole('tab', { name: 'Policies' }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'App configuration' })).toBeFocused();
  await expect(page.getByLabel('App name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review changes…' })).toBeDisabled();
});

test('A23 filter is a toggle group in the card, kept in the URL and shown in the export dialog', async ({ page }) => {
  await mockStaffApi(page, { authenticated: true, permissions: ['overview.read', 'audit.read', 'exports.create'] });
  await page.goto('/administration/audit');
  await expect(page.getByRole('tab')).toHaveCount(0);
  const group = page.getByRole('group', { name: 'Filter events' });
  await expect(page.getByRole('region', { name: 'Activity evidence' }).getByRole('group', { name: 'Filter events' })).toBeVisible();
  await group.getByRole('button', { name: 'Financial changes' }).click();
  await expect(group.getByRole('button', { name: 'Financial changes' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/filter=financial/);
  await page.reload();
  await expect(group.getByRole('button', { name: 'Financial changes' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Export authorised scope…' }).click();
  await expect(page.locator('dialog .export-scope')).toContainText('Financial changes');
});

test('Swahili tab and button labels fit without wrapping at 1280px and scroll on phones', async ({ page }) => {
  await mockSettings(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/administration/settings');
  await page.getByRole('button', { name: /Switch to Swahili/ }).click();
  await expect(page.getByRole('tab', { name: 'Usanidi wa programu' })).toBeVisible();
  for (const element of await page.locator('[role=tab], header.page-header .button').all()) {
    const box = await element.evaluate(node => ({ scroll: node.scrollWidth, client: node.clientWidth, height: node.getBoundingClientRect().height }));
    expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
    expect(Math.round(box.height)).toBe(40);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.locator('.tabs').evaluate(node => getComputedStyle(node).overflowX)).toBe('auto');
});
