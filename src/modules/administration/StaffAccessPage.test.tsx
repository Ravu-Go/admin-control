import { render as renderDom, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '../../app/i18n';
import { StaffAccessPage } from './StaffAccessPage';

// Tabs keep their selection in the URL, so the page needs a router.
const render = (element: ReactElement) => renderDom(<MemoryRouter>{element}</MemoryRouter>);
const now = '2026-11-26T10:00:00Z';
const metadata = { version: 1, created_at: now, updated_at: now, created_by: null, updated_by: null };
const roles = [{ ...metadata, id: 'demo-role', name: 'Fictional reviewer', name_sw: 'Mhakiki wa mfano', key: 'demo-role', enabled: true, protected: false, defaults: false, permissions: ['accounts.read' as const] }];
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
    await user.click(screen.getByRole('tab', { name: 'Staff' }));
    expect(screen.getByText('f***@example.test')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Find staff' }), 'unmatched');
    expect(screen.getByText('No staff match these filters.')).toBeInTheDocument();
    expect(screen.getByText('0 of 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await user.click(screen.getByRole('button', { name: 'Suspended', pressed: false }));
    expect(screen.getByRole('button', { name: 'Suspended' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No staff match these filters.')).toBeInTheDocument();
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
  });
  it('searches capabilities and filters roles in the matrix', async () => {
    const user = userEvent.setup();
    render(<StaffAccessPage {...props}/>);
    await user.type(screen.getByRole('searchbox', { name: 'Search capabilities' }), 'access');
    expect(screen.getByRole('rowheader', { name: 'access.manage' })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'accounts.read' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(screen.getByText('No roles match this filter.')).toBeInTheDocument();
  });
  it('requires an explicit role and scope before an invitation can be reviewed', async () => {
    const user = userEvent.setup();
    const onRequestChange = vi.fn().mockResolvedValue(undefined);
    render(<StaffAccessPage {...props} onRequestChange={onRequestChange}/>);
    await user.click(screen.getByRole('button', { name: 'Invite staff…' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Fictional new staff');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'new@example.test');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'demo-role');
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

