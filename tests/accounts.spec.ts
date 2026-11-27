import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockAccounts } from './support/accounts-api';

test('A02 directory uses server filters, masked data and bilingual navigation', async ({ page }) => {
  const state = await mockAccounts(page);
  await page.goto('/accounts');
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export masked list' })).toBeDisabled();
  await page.getByRole('button', { name: 'Drivers', exact: true }).click();
  await expect(page).toHaveURL(/view=drivers/);
  await expect.poll(() => state.queries.at(-1)?.searchParams.get('audience')).toBe('drivers');
  await page.getByRole('link', { name: 'Open account 14', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account review · Amina M.' })).toBeVisible();
  await expect(page.getByText('+255 *** *** 245', { exact: false })).toBeVisible();
  await expect(page.getByText('LATRA licence belongs to another vehicle')).toBeVisible();
  await page.getByRole('button', { name: /Switch to Swahili/ }).click();
  await expect(page.getByRole('heading', { name: 'Ukaguzi wa akaunti · Amina M.' })).toBeVisible();
  await page.getByRole('button', { name: /Badili kwenda Kiingereza/ }).click();
  await page.getByRole('tab', { name: 'Documents', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Module not connected yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm suspension' })).toHaveCount(0);
});

test('A03 validates bilingual reasons and sends one versioned confirmed command', async ({ page }) => {
  const state = await mockAccounts(page);
  await page.goto('/accounts/14');
  await page.getByRole('button', { name: 'Suspend account…', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm suspension', exact: true }).click();
  expect(state.calls).toHaveLength(0);
  await expect(page.getByLabel('Member-facing reason · EN · required')).toBeFocused();
  await page.getByLabel('Member-facing reason · EN · required').fill('Fictional review requires a pause.');
  await page.getByLabel('Member-facing reason · SW · required').fill('Ukaguzi wa mfano unahitaji kusitisha.');
  await page.getByLabel('Internal evidence reference · optional').fill('CASE-TEST-014');
  state.delay = 500;
  await page.getByRole('button', { name: 'Confirm suspension', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reinstate account…', exact: true })).toBeVisible();
  expect(state.calls).toHaveLength(1);
  expect(state.calls[0]?.body).toMatchObject({ version: 1, confirmed: true, status: 'suspended', evidence_reference: 'CASE-TEST-014' });
  expect(state.calls[0]?.key).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByText('LATRA licence belongs to another vehicle')).toBeVisible();
});

test('conflict retains draft and blocks resubmission until the current account is reviewed', async ({ page }) => {
  const state = await mockAccounts(page);
  await page.goto('/accounts/14');
  await page.getByRole('button', { name: 'Suspend account…', exact: true }).click();
  await page.getByLabel('Member-facing reason · EN · required').fill('Fictional decision draft retained.');
  await page.getByLabel('Member-facing reason · SW · required').fill('Rasimu ya uamuzi wa mfano inahifadhiwa.');
  state.status = 409;
  await page.getByRole('button', { name: 'Confirm suspension', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your draft is retained');
  await expect(page.getByRole('button', { name: 'Confirm suspension', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Member-facing reason · EN · required')).toHaveValue('Fictional decision draft retained.');
  await page.getByRole('button', { name: 'Reload account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm suspension', exact: true })).toBeEnabled();
  state.status = 200;
  await page.getByRole('button', { name: 'Confirm suspension', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reinstate account…', exact: true })).toBeVisible();
  expect(state.calls[0]?.key).toBe(state.calls[1]?.key);
});

test('read-only staff cannot act; failed reads hide records and expose retry', async ({ page }) => {
  const state = await mockAccounts(page, { readOnly: true });
  await page.goto('/accounts/14');
  await expect(page.getByRole('heading', { name: 'Account review · Amina M.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suspend account…', exact: true })).toHaveCount(0);
  state.listStatus = 403;
  await page.goto('/accounts');
  await expect(page.getByRole('alert')).toContainText('permissions');
  await expect(page.getByRole('table')).toHaveCount(0);
  state.listStatus = 200;
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
});

test('A02/A03 desktop and narrow keyboard/accessibility review', async ({ page }, testInfo) => {
  await mockAccounts(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/accounts');
    await expect(page.getByRole('table')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`a02-${width}.png`), fullPage: true });
    await page.goto('/accounts/14');
    await page.getByRole('button', { name: 'Suspend account…', exact: true }).click();
    await expect(page.getByLabel('Member-facing reason · EN · required')).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`a03-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(a11y.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  }
});


test('loading and empty directory states never fabricate account rows or totals', async ({ page }) => {
  const state = await mockAccounts(page);
  state.readDelay = 800;
  await page.goto('/accounts');
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open account 14' })).toHaveCount(0);
  await expect(page.getByRole('table')).toBeVisible();
  state.empty = true;
  state.readDelay = 0;
  await page.reload();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect(page.getByText('0 accounts · No bulk approval or suspension')).toBeVisible();
});
