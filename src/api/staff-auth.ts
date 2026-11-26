import { z } from 'zod';
import type { components } from './generated/admin';

export type StaffBootstrap = components['schemas']['Bootstrap'];
export type StaffLogin = components['schemas']['LoginRequest'];
export type StaffAuthState = components['schemas']['AuthState'];
export type StaffMfaCode = components['schemas']['MfaCode'];
export type StaffMfaSetup = components['schemas']['MfaSetup'];
export type StaffPasswordCodeRequest = components['schemas']['StaffPasswordCodeRequest'];
export type StaffPasswordCodeSent = components['schemas']['StaffPasswordCodeSent'];
export type StaffPasswordChangeRequest = components['schemas']['StaffPasswordChangeRequest'];
export type StaffStepUpRequest = components['schemas']['StepUpRequest'];
export type StaffStepUp = components['schemas']['StepUp'];
export class StaffAuthError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const bootstrapSchema: z.ZodType<StaffBootstrap> = z.object({
  staff_id: z.string().min(1), role: z.string().min(1), is_super_admin: z.boolean().default(false),
  permissions: z.array(z.custom<StaffBootstrap['permissions'][number]>(value => typeof value === 'string')),
  environment: z.enum(['local','testing','staging','production']), demo_mode: z.boolean(), demo_banner_required: z.boolean(),
  timezone: z.literal('Africa/Dar_es_Salaam'), locale: z.enum(['en','sw']), enabled_features: z.array(z.string()),
  open_sos_count: z.number().int().nonnegative().nullable(), session_expires_at: z.iso.datetime({ offset: true }), idle_expires_at: z.iso.datetime({ offset: true }),
});
const stateSchema: z.ZodType<StaffAuthState> = z.object({
  state: z.enum(['mfa_required','enrollment_required','password_change_required','authenticated','logged_out']), staff_id: z.string().nullable(), absolute_expires_at: z.iso.datetime({ offset: true }).nullable(),
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
export async function staffRequest(path: string, body?: object, signal?: AbortSignal, csrfRefreshed = false, idempotencyKey?: string): Promise<unknown> {
  if (body && signal?.aborted) throw new StaffAuthError(0, 'unavailable');
  const token = body ? csrfToken() : '';
  if (body && !token) {
    if (csrfRefreshed) throw new StaffAuthError(419, 'csrf_expired');
    await staffRequest('/sanctum/csrf-cookie', undefined, signal);
    return staffRequest(path, body, signal, true, idempotencyKey);
  }
  let response: Response;
  try {
    response = await fetch(new URL(path, origin()), {
      method: body ? 'POST' : 'GET', credentials: 'include', redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
    });
  } catch { throw new StaffAuthError(0, 'unavailable'); }
  // Laravel rejects 419 before the controller runs. Refresh once, reread the
  // cookie, then retry that rejected POST; never replay a 401, 429 or timeout.
  if (response.status === 419 && body && !csrfRefreshed) {
    await staffRequest('/sanctum/csrf-cookie', undefined, signal);
    return staffRequest(path, body, signal, true, idempotencyKey);
  }
  if (!response.ok) {
    let code = response.status === 401 ? 'unauthenticated' : 'request_failed';
    try { const error = z.object({ error: z.string().max(100) }).parse(await response.json()); code = error.error; } catch { /* Do not display raw server messages or HTML. */ }
    throw new StaffAuthError(response.status, code);
  }
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) throw new StaffAuthError(0, 'unavailable');
  try { return await response.json() as unknown; } catch { throw new StaffAuthError(0, 'unavailable'); }
}
const request = staffRequest;
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
export async function setupStaffMfa(): Promise<StaffMfaSetup> {
  return z.object({ secret: z.string().min(16), otpauth_uri: z.string().startsWith('otpauth://totp/') }).parse(data(await request('/api/v1/admin/console/auth/mfa/setup', {})));
}
export async function confirmStaffMfa(values: StaffMfaCode): Promise<StaffAuthState> {
  return stateSchema.parse(data(await request('/api/v1/admin/console/auth/mfa/confirm', values)));
}
export async function sendPasswordCode(values: StaffPasswordCodeRequest, signal?: AbortSignal): Promise<StaffPasswordCodeSent> {
  await request('/sanctum/csrf-cookie', undefined, signal);
  if (signal?.aborted) throw new StaffAuthError(0, 'unavailable');
  return z.object({ expires_in: z.literal(600), resend_after: z.literal(60) }).strict().parse(data(await request('/api/v1/admin/console/auth/password/code', values, signal)));
}
export async function changeStaffPassword(values: StaffPasswordChangeRequest, signal?: AbortSignal): Promise<void> {
  const result = stateSchema.parse(data(await request('/api/v1/admin/console/auth/password/change', values, signal)));
  if (result.state !== 'logged_out') throw new StaffAuthError(0, 'unavailable');
}

export async function reauthenticateStaff(values: StaffStepUpRequest, signal?: AbortSignal): Promise<StaffStepUp> {
  await request('/sanctum/csrf-cookie', undefined, signal);
  const result = z.object({ action: z.string(), expires_at: z.iso.datetime({ offset: true }) }).strict()
    .parse(data(await request('/api/v1/admin/console/auth/step-up', values, signal)));
  if (result.action !== values.action || Date.parse(result.expires_at) <= Date.now()) throw new StaffAuthError(401, 'step_up_expired');
  return result;
}
