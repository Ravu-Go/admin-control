import { z } from 'zod';
import type { components } from './generated/admin';
import { StaffAuthError, staffRequest } from './staff-auth';

export type OverviewReport = components['schemas']['OverviewReport'];
export type OverviewFilters = { from: string; to: string; audience: 'both' | 'rider' | 'driver'; area_id?: string };
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.iso.datetime({ offset: true });
const schema: z.ZodType<OverviewReport> = z.object({
  kind: z.literal('overview'), period_start: timestamp, period_end: timestamp, timezone: z.literal('Africa/Dar_es_Salaam'),
  metrics: z.array(z.object({ key: z.string(), numerator: count.nullable(), denominator: count.nullable(),
    amount: z.object({ currency: z.literal('TZS'), amount_minor: count }).nullable(), availability: z.enum(['available','unavailable']), unavailable_reason: z.string().nullable() })),
  filters: z.object({ area_id: z.string().nullable(), audience: z.enum(['both','rider','driver']) }),
  areas: z.array(z.object({ id: z.string(), name: z.object({ en: z.string(), sw: z.string() }) })),
  daily: z.array(z.object({ date: z.iso.date(), riders: count, drivers: count, membership_receipts_minor: count })),
  user_breakdown: z.object({ riders: count, drivers: count }), memberships: z.array(z.object({ code: z.string(), count })),
  recent_registrations: z.array(z.object({ id: z.string(), kind: z.enum(['rider','driver']), created_at: timestamp, phone_verified: z.boolean(), email_verified: z.boolean() })).max(5),
});

export async function loadOverview(filters: OverviewFilters, signal?: AbortSignal): Promise<{ report: OverviewReport; updatedAt: string }> {
  const query = new URLSearchParams(filters);
  const response = z.object({ data: schema, meta: z.object({ server_time: timestamp }) }).safeParse(
    await staffRequest(`/api/v1/admin/console/overview?${query}`, undefined, signal),
  );
  if (!response.success) throw new StaffAuthError(0, 'unavailable');
  const keys = response.data.data.metrics.map(metric => metric.key);
  if (new Set(keys).size !== keys.length || !['registered_users','registrations','membership_receipts','eligible_online_drivers'].every(key => keys.includes(key))) throw new StaffAuthError(0, 'unavailable');
  return { report: response.data.data, updatedAt: response.data.meta.server_time };
}

/** EAT calendar-day windows are converted to UTC instants for the API. */
export function overviewPeriod(days: number, now = new Date()): { from: string; to: string } {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const midnight = Date.parse(`${day}T00:00:00+03:00`);
  return { from: new Date(midnight - (days - 1) * 86_400_000).toISOString(), to: new Date(midnight + 86_400_000).toISOString() };
}
