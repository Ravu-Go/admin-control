import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '../../app/i18n';
import { StaffAccessPage } from './StaffAccessPage';
const now = '2026-11-26T10:00:00Z';
const metadata = { version: 1, created_at: now, updated_at: now, created_by: null, updated_by: null };
const roles = [{ ...metadata, id: 'demo-role', name: 'Fictional reviewer', permissions: ['accounts.read' as const] }];
const staff = [{ ...metadata, id: 'demo-staff', display_name: 'Fictional staff member', email_masked: 'f***@example.test', role_ids: ['demo-role'], status: 'active' as const, mfa_enrolled: true }];
const props = { roles, staff, permissions: ['access.read', 'access.manage'] as const, capabilities: ['accounts.read', 'access.manage'] as const, areas: [{ id: 'demo-area', label: 'Fictional area' }], onReload: vi.fn() };
describe('staff administration interface', () => {
  it('shows explicit grants and denies editing without a connected command adapter', () => {
    render(<StaffAccessPage {...props}/>);
    expect(screen.getByText('Granted')).toBeInTheDocument();
    expect(screen.getAllByText('No access')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Invite staff…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create role' })).toBeDisabled();
  });
  it('shows masked staff information and filters the current dataset', async () => {
    const user = userEvent.setup();
    render(<StaffAccessPage {...props}/>);
    await user.click(screen.getByRole('tab', { name: 'Staff', exact: true }));
    expect(screen.getByText('f***@example.test')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Find staff' }), 'unmatched');
    expect(screen.getByText('No staff match these filters.')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 displayed')).toBeInTheDocument();
  });
  it('requires an explicit role and scope before an invitation can be reviewed', async () => {
    const user = userEvent.setup();
    const onRequestChange = vi.fn().mockResolvedValue(undefined);
    render(<StaffAccessPage {...props} onRequestChange={onRequestChange}/>);
    await user.click(screen.getByRole('button', { name: 'Invite staff…' }));
    await user.type(screen.getByRole('textbox', { name: 'Name', exact: true }), 'Fictional new staff');
    await user.type(screen.getByRole('textbox', { name: 'Email', exact: true }), 'new@example.test');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Role', exact: true }), 'demo-role');
    expect(screen.getByRole('button', { name: 'Review request' })).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Access scope' }), 'area');
    expect(screen.getByRole('button', { name: 'Review request' })).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Operating area' }), 'demo-area');
    await user.click(screen.getByRole('button', { name: 'Review request' }));
    expect(onRequestChange).not.toHaveBeenCalled();
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
  });
  it('renders a permission denial without exposing staff rows', () => {
    render(<StaffAccessPage {...props} permissions={[]}/>);
    expect(screen.getByText('You need permission to view staff administration.')).toBeInTheDocument();
    expect(screen.queryByText('Fictional staff member')).not.toBeInTheDocument();
  });
});
