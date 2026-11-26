import { z } from 'zod';
import type { components } from './generated/admin';
import { staffRequest } from './staff-auth';

export type Staff = components['schemas']['Staff'];
export type Role = components['schemas']['Role'];
export type AccessRequest = components['schemas']['AccessRequest'];
export type Session = components['schemas']['Session'];
export type Invitation = components['schemas']['StaffInvitation'];
export type Command = components['schemas']['StaffManagementCommand'];
export type Area = components['schemas']['ManagementArea'];
export type Page<T> = { data: T[]; total: number; page: number; lastPage: number };
const metadata = { id: z.string(), version: z.number().int().positive(), created_at: z.string(), updated_at: z.string(), created_by: z.string().nullable(), updated_by: z.string().nullable() };
const permission = z.custom<Role['permissions'][number]>(value => typeof value === 'string');
const staff: z.ZodType<Staff> = z.object({ ...metadata, display_name: z.string(), email_masked: z.string(), role_ids: z.array(z.string()), status: z.enum(['active', 'suspended']), mfa_enrolled: z.boolean() });
const role: z.ZodType<Role> = z.object({ ...metadata, name: z.string(), name_sw: z.string(), key: z.string(), enabled: z.boolean(), protected: z.boolean(), defaults: z.boolean(), permissions: z.array(permission) });
const scope = z.object({ kind: z.enum(['global', 'area']), area_id: z.number().int().positive().nullable() });
const access: z.ZodType<AccessRequest> = z.object({ ...metadata, approval_mode: z.enum(['independent', 'super_admin']).default('independent'), kind: z.enum(['invite', 'staff', 'role']), subject_id: z.string().nullable(), subject_version: z.number().int().positive().nullable(), status: z.enum(['pending', 'approved', 'rejected']), requested_by: z.string(), approved_by: z.string().nullable(), request_hash: z.string().length(64), reason: z.string(), summary: z.object({ name: z.string(), email_masked: z.string().nullable(), role_id: z.string().nullable(), scope: scope.nullable(), status: z.string().nullable(), enabled: z.boolean().nullable(), permissions: z.array(permission).nullable() }) });
const session: z.ZodType<Session> = z.object({ ...metadata, staff_id: z.string(), last_activity_at: z.string(), expires_at: z.string(), revoked: z.boolean(), current: z.boolean() });
const invitation: z.ZodType<Invitation> = z.object({ ...metadata, email_masked: z.string(), role_id: z.string().nullable(), status: z.enum(['pending', 'accepted', 'revoked', 'expired']), expires_at: z.string() });
const base = '/api/v1/admin/console/';
async function page<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<Page<T>> {
  const result = z.object({ data: z.array(schema), meta: z.object({ pagination: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), last_page: z.number().int().positive() }) }) }).parse(await staffRequest(base + path, undefined, signal));
  return { data: result.data, total: result.meta.pagination.total, page: result.meta.pagination.page, lastPage: result.meta.pagination.last_page };
}
export const loadStaff = (pageNumber: number, status: string, signal?: AbortSignal) => page(`staff?page=${pageNumber}${status ? '&status=' + encodeURIComponent(status) : ''}`, staff, signal);
export const loadRequests = (pageNumber: number, signal?: AbortSignal) => page(`access-requests?page=${pageNumber}`, access, signal);
export const loadInvitations = (pageNumber: number, signal?: AbortSignal) => page(`staff-invitations?page=${pageNumber}`, invitation, signal);
export const loadSessions = (id: string, pageNumber: number, signal?: AbortSignal) => page(`staff/${encodeURIComponent(id)}/sessions?page=${pageNumber}`, session, signal);
export async function loadRoles(signal?: AbortSignal): Promise<Role[]> {
  // Role selection and matrices require the full catalogue, not only the first page.
  const rows: Role[] = [];
  for (let index = 1; ; index++) {
    const result = await page(`roles?per_page=100&page=${index}`, role, signal);
    rows.push(...result.data);
    if (index >= result.lastPage) return rows;
  }
}
export async function loadAreas(signal?: AbortSignal): Promise<Area[]> {
  return z.object({ data: z.array(z.object({ id: z.string(), label: z.string() })) }).parse(await staffRequest(base + 'operating-areas', undefined, signal)).data;
}
export async function submitChange(command: Command, idempotencyKey: string): Promise<void> {
  z.object({ data: access }).parse(await staffRequest(base + 'access-requests', command, undefined, false, idempotencyKey));
}
export async function reviewChange(record: AccessRequest, decision: 'approve' | 'reject', reason: string, idempotencyKey: string): Promise<void> {
  z.object({ data: access }).parse(await staffRequest(base + `access-requests/${encodeURIComponent(record.id)}/review`, { version: record.version, request_hash: record.request_hash, decision, reason, confirmed: true }, undefined, false, idempotencyKey));
}
export async function revoke(path: string, version: number, reason: string, idempotencyKey: string): Promise<void> {
  z.object({ data: z.object({ revoked: z.literal(true) }) }).parse(await staffRequest(base + path, { version, reason, confirmed: true }, undefined, false, idempotencyKey));
}
/** Issue a fresh one-use link for a pending or expired invitation; the previous link stops working. */
export async function resendInvitation(record: Invitation, reason: string, idempotencyKey: string): Promise<Invitation> {
  const body: components['schemas']['ConfirmedVersion'] = { version: record.version, reason, confirmed: true };
  return z.object({ data: invitation }).parse(await staffRequest(base + `staff-invitations/${encodeURIComponent(record.id)}/resend`, body, undefined, false, idempotencyKey)).data;
}
export async function acceptInvitation(values: components['schemas']['ConsoleInvitationAccept'], signal?: AbortSignal): Promise<'staff' | 'rider' | 'driver' | 'partner'> {
  return z.object({ data: z.object({ state: z.literal('sign_in_required'), account_kind: z.enum(['staff', 'rider', 'driver', 'partner']).default('staff') }) }).parse(await staffRequest(base + 'auth/invitations/accept', values, signal)).data.account_kind;
}
export type ManagedUser = components['schemas']['ManagedUser'];
export type ManagedUserCreate = components['schemas']['ManagedUserCreate'];
const managedUser: z.ZodType<ManagedUser> = z.object({ id: z.string(), version: z.number().int().positive(), display_name: z.string(), kind: z.enum(['rider', 'driver', 'partner']), status: z.enum(['active', 'suspended', 'closed']), email_masked: z.string().nullable(), phone_masked: z.string().nullable(), email_verified: z.boolean(), phone_verified: z.boolean(), created_at: z.string() });
export const loadManagedUsers = (pageNumber: number, kind: string, signal?: AbortSignal) => page('managed-users?page=' + pageNumber + (kind ? '&kind=' + encodeURIComponent(kind) : ''), managedUser, signal);
export async function createManagedUser(command: ManagedUserCreate, idempotencyKey: string): Promise<void> {
  z.object({ data: managedUser }).parse(await staffRequest(base + 'managed-users', command, undefined, false, idempotencyKey));
}
