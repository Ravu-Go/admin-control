import type { OverviewReport } from '../../src/api/overview';

export function overviewFixture(): OverviewReport {
  return {
    kind: 'overview', period_start: '2026-11-19T21:00:00Z', period_end: '2026-11-26T21:00:00Z', timezone: 'Africa/Dar_es_Salaam',
    filters: { area_id: null, audience: 'both' }, areas: [{ id: '1', name: { en: 'Dar es Salaam', sw: 'Dar es Salaam' } }],
    metrics: [
      { key: 'registered_users', numerator: 12500, denominator: null, amount: null, availability: 'available', unavailable_reason: null },
      { key: 'registrations', numerator: 1200, denominator: null, amount: null, availability: 'available', unavailable_reason: null },
      { key: 'membership_receipts', numerator: 8, denominator: null, amount: { currency: 'TZS', amount_minor: 245000000 }, availability: 'available', unavailable_reason: null },
      { key: 'eligible_online_drivers', numerator: 128, denominator: null, amount: null, availability: 'available', unavailable_reason: null },
    ],
    daily: [140,160,170,185,200,220,125].map((total,index) => ({ date: `2026-11-${20 + index}`, riders: Math.round(total * .8), drivers: total - Math.round(total * .8), membership_receipts_minor: [20000000,35000000,20000000,35000000,45000000,55000000,35000000][index]! })),
    user_breakdown: { riders: 10000, drivers: 2500 }, memberships: [{ code: 'BASIC', count: 600 }, { code: 'PRO', count: 420 }, { code: 'ELITE', count: 180 }],
    recent_registrations: ['12500','12499','12498'].map((id,index) => ({ id, kind: index % 2 ? 'driver' : 'rider', created_at: `2026-11-26T06:4${index}:08Z`, phone_verified: index === 0, email_verified: index === 2 })),
  };
}
