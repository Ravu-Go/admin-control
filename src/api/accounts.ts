import { z } from 'zod';
import type { components } from './generated/admin';
import { StaffAuthError, staffRequest } from './staff-auth';

export type Account = components['schemas']['Account'];
export type AccountDetail = components['schemas']['AccountDetail'];
export type AccountStatus = components['schemas']['AccountStatus'];
const timestamp = z.iso.datetime({ offset: true });
const account: z.ZodType<Account> = z.object({
  id: z.string(), version: z.number().int().positive(), created_at: timestamp, updated_at: timestamp,
  created_by: z.string().nullable(), updated_by: z.string().nullable(), display_name: z.string(),
  kind: z.enum(['client', 'driver', 'partner', 'staff']), phone_masked: z.string(), email_masked: z.string().nullable(), nida_masked: z.string().nullable(),
  area_name: z.object({ en: z.string(), sw: z.string() }).nullable(),
  account_status: z.enum(['active', 'suspended', 'closed']),
  verification_status: z.enum(['not_started', 'pending', 'under_review', 'verified', 'rejected', 'suspended', 'expired']),
  membership_status: z.string().nullable(), appeal_available: z.boolean(),
  dispatch_eligibility: z.object({ eligible: z.boolean(), blockers: z.array(z.string()), evaluated_at: timestamp }),
});
const history = z.array(z.object({ id: z.string(), action: z.string(), created_at: timestamp })).max(20);
const detail: z.ZodType<AccountDetail> = account.and(z.object({ history }));
const pagination = z.object({ page: z.number().int().positive(), per_page: z.number().int().positive(), total: z.number().int().nonnegative(), last_page: z.number().int().positive() });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new StaffAuthError(0, 'unavailable');
  return result.data;
}
export async function loadAccounts(filters: { page: number; view: string }, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(filters.page) });
  if (filters.view === 'needs_review') params.set('status', 'needs_review');
  else params.set('audience', filters.view);
  return parse(z.object({ data: z.array(account), meta: z.object({ pagination, server_time: timestamp }) }),
    await staffRequest(`/api/v1/admin/console/accounts?${params}`, undefined, signal));
}
export async function loadAccount(id: string, signal?: AbortSignal) {
  return parse(z.object({ data: detail }), await staffRequest(`/api/v1/admin/console/accounts/${encodeURIComponent(id)}`, undefined, signal)).data;
}
export async function changeAccountStatus(id: string, command: AccountStatus, key: string) {
  return parse(z.object({ data: account }), await staffRequest(`/api/v1/admin/console/accounts/${encodeURIComponent(id)}/status`, command, undefined, false, key)).data;
}
