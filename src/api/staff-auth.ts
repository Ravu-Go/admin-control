import { z } from 'zod';
import type { components } from './generated/admin';

export type StaffBootstrap = components['schemas']['Bootstrap'];
export type StaffLogin = components['schemas']['LoginRequest'];
export type StaffAuthState = components['schemas']['AuthState'];
export type StaffMfaCode = components['schemas']['MfaCode'];
export class StaffAuthError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const bootstrapSchema: z.ZodType<StaffBootstrap> = z.object({
  staff_id: z.string().min(1), role: z.string().min(1),
  permissions: z.array(z.custom<StaffBootstrap['permissions'][number]>(value => typeof value === 'string')),
  environment: z.enum(['local','testing','staging','production']), demo_mode: z.boolean(), demo_banner_required: z.boolean(),
  timezone: z.literal('Africa/Dar_es_Salaam'), locale: z.enum(['en','sw']), enabled_features: z.array(z.string()),
  open_sos_count: z.number().int().nonnegative().nullable(), session_expires_at: z.iso.datetime({ offset: true }), idle_expires_at: z.iso.datetime({ offset: true }),
});
const stateSchema: z.ZodType<StaffAuthState> = z.object({
  state: z.enum(['mfa_required','enrollment_required','authenticated','logged_out']), staff_id: z.string().nullable(), absolute_expires_at: z.iso.datetime({ offset: true }).nullable(),
});
function origin() {
  const url = new URL(import.meta.env.VITE_API_BASE_URL || 'https://staging-api.ravultd.com');
  if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new StaffAuthError(0, 'unavailable');
  return url.origin;
}
function csrfToken() {
  try { return decodeURIComponent(document.cookie.split('; ').find(cookie => cookie.startsWith('XSRF-TOKEN='))?.slice(11) || ''); }
  catch { return ''; }
}
async function request(path: string, body?: StaffLogin | StaffMfaCode | Record<string, never>) {
  const token = body ? csrfToken() : '';
  if (body && !token) throw new StaffAuthError(419, 'csrf_expired');
  let response: Response;
  try {
    response = await fetch(new URL(path, origin()), {
      method: body ? 'POST' : 'GET', credentials: 'include', redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15_000),
    });
  } catch { throw new StaffAuthError(0, 'unavailable'); }
  if (!response.ok) throw new StaffAuthError(response.status, response.status === 401 ? 'unauthenticated' : 'request_failed');
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) throw new StaffAuthError(0, 'unavailable');
  try { return await response.json() as unknown; } catch { throw new StaffAuthError(0, 'unavailable'); }
}
function data(value: unknown): unknown { return z.object({ data: z.unknown() }).parse(value).data; }
export async function loadStaffSession(): Promise<StaffBootstrap> {
  const result = bootstrapSchema.safeParse(data(await request('/api/v1/admin/console/bootstrap')));
  if (!result.success) throw new StaffAuthError(0, 'unavailable');
  if (Math.min(Date.parse(result.data.session_expires_at), Date.parse(result.data.idle_expires_at)) <= Date.now()) throw new StaffAuthError(401, 'session_expired');
  return result.data;
}
export async function signInStaff(values: StaffLogin): Promise<StaffAuthState> {
  await request('/sanctum/csrf-cookie');
  return stateSchema.parse(data(await request('/api/v1/admin/console/auth/login', values)));
}
export async function verifyStaffMfa(values: StaffMfaCode): Promise<StaffAuthState> {
  return stateSchema.parse(data(await request('/api/v1/admin/console/auth/mfa/verify', values)));
}
export async function signOutStaff(): Promise<void> {
  await request('/sanctum/csrf-cookie');
  await request('/api/v1/admin/console/auth/logout', {});
}
