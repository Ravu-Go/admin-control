import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadOverview, overviewPeriod } from './overview';
import { overviewFixture } from '../../tests/support/overview-fixture';

afterEach(() => vi.unstubAllGlobals());
describe('Overview contract boundary', () => {
  it('uses EAT calendar days across UTC midnight and month boundaries', () => {
    expect(overviewPeriod(1, new Date('2026-11-26T21:30:00Z'))).toEqual({ from: '2026-11-26T21:00:00.000Z', to: '2026-11-27T21:00:00.000Z' });
    expect(overviewPeriod(7, new Date('2026-12-01T09:00:00Z'))).toEqual({ from: '2026-11-24T21:00:00.000Z', to: '2026-12-01T21:00:00.000Z' });
  });
  it('sends the scoped filters with cookie credentials and parses integer minor units', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: overviewFixture(), meta: { server_time: '2026-11-26T09:00:00Z' } }), { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const value = await loadOverview({ ...overviewPeriod(7), area_id: '1', audience: 'driver' });
    expect(value.report.metrics[2]?.amount?.amount_minor).toBe(245000000);
    expect(String(fetch.mock.calls[0]?.[0])).toContain('area_id=1');
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
  });
  it('rejects malformed or incomplete snapshots rather than fabricating zero totals', async () => {
    for (const data of [{ ...overviewFixture(), metrics: [] }, { ...overviewFixture(), user_breakdown: { riders: -1, drivers: 0 } }]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data, meta: { server_time: '2026-11-26T09:00:00Z' } }), { headers: { 'content-type': 'application/json' } })));
      await expect(loadOverview({ ...overviewPeriod(7), audience: 'both' })).rejects.toMatchObject({ code: 'unavailable' });
    }
  });
});
