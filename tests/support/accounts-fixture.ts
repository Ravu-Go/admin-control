import type { AccountDetail } from '../../src/api/accounts';
export const accountFixture = (id = '14'): AccountDetail => ({
  id, version: 1, created_at: '2026-11-27T08:00:00Z', updated_at: '2026-11-27T08:00:00Z', created_by: null, updated_by: null,
  display_name: 'Amina M.', kind: 'driver', phone_masked: '+255 *** *** 245', email_masked: 'a***@***', nida_masked: null,
  area_name: { en: 'Mwenge', sw: 'Mwenge' }, account_status: 'active', verification_status: 'under_review', membership_status: 'active',
  dispatch_eligibility: { eligible: false, blockers: ['document_licence_not_approved', 'document_latra_licence_vehicle_mismatch'], evaluated_at: '2026-11-27T08:00:00Z' }, appeal_available: false,
  history: [{ id: '1', action: 'account.status_changed', created_at: '2026-11-27T07:43:00Z' }],
});
