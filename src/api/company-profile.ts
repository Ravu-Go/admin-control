import { z } from 'zod';
import type { components } from './generated/admin';
import { origin, staffRequest } from './staff-auth';

export type CompanyProfile = components['schemas']['CompanyProfile'];
export type CompanyEdit = components['schemas']['CompanyEdit'];
type Change = Pick<CompanyEdit, 'version' | 'reason'>;

const profile: z.ZodType<CompanyProfile> = z.object({
  name: z.string().min(1).max(120),
  logo_url: z.string().url().nullable(),
  office_location: z.object({ address: z.string(), latitude: z.number().nullable(), longitude: z.number().nullable() }).nullable(),
  support_email: z.string().nullable(),
  support_phone: z.string().nullable(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().nullable(),
});
const envelope = z.object({ data: profile });
const base = '/api/v1/admin/console/company-profile';

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export async function loadCompanyProfile(signal?: AbortSignal): Promise<CompanyProfile> {
  return envelope.parse(await staffRequest(base, undefined, signal)).data;
}

export async function updateCompanyProfile(values: Omit<CompanyEdit, 'confirmed'>, idempotencyKey: string): Promise<CompanyProfile> {
  const body: CompanyEdit = { ...values, confirmed: true };
  return envelope.parse(await staffRequest(base, body, undefined, false, idempotencyKey, 'PATCH')).data;
}

export async function uploadCompanyLogo(file: File, change: Change, idempotencyKey: string): Promise<CompanyProfile> {
  const form = new FormData();
  form.append('version', String(change.version));
  form.append('reason', change.reason);
  form.append('confirmed', '1');
  form.append('file', file);
  return envelope.parse(await staffRequest(base + '/logo', form, undefined, false, idempotencyKey)).data;
}

export async function removeCompanyLogo(change: Change, idempotencyKey: string): Promise<CompanyProfile> {
  return envelope.parse(await staffRequest(base + '/logo/removal', { ...change, confirmed: true }, undefined, false, idempotencyKey)).data;
}

/** Public, unauthenticated branding read used by the console chrome; failures fall back to the built-in Ravu brand. */
export async function loadPublicBranding(signal?: AbortSignal): Promise<Pick<CompanyProfile, 'name' | 'logo_url'>> {
  const response = await fetch(new URL('/api/v1/company-profile', origin()), { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error('branding unavailable');
  const data = z.object({ data: z.object({ name: z.string().min(1).max(120), logo_url: z.string().url().nullable() }) }).parse(await response.json()).data;
  // Only accept a logo served by the configured API origin.
  return { name: data.name, logo_url: data.logo_url && new URL(data.logo_url).origin === origin() ? data.logo_url : null };
}
