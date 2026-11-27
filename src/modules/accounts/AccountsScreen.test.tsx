import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import '../../app/i18n';
import { AccountsScreen } from './AccountsScreen';
import { accountFixture } from '../../../tests/support/accounts-fixture';
import { loadAccounts } from '../../api/accounts';

vi.mock('../../app/StaffSession', () => ({ useStaffSession: () => ({ clear: vi.fn(), session: { permissions: ['accounts.read'] } }) }));
vi.mock('../../api/accounts', () => ({ loadAccounts: vi.fn(), loadAccount: vi.fn(), changeAccountStatus: vi.fn() }));
function mount() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AccountsScreen/></MemoryRouter></QueryClientProvider>); }
describe('Accounts directory', () => {
  it('shows masked rows, permission-limited exports and sends filters to the server', async () => {
    vi.mocked(loadAccounts).mockResolvedValue({ data: [accountFixture()], meta: { server_time: '2026-11-27T08:00:00Z', pagination: { page: 1, per_page: 25, total: 1, last_page: 1 } } });
    mount();
    expect(await screen.findByRole('link', { name: 'Open account 14' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export masked list' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Drivers' }));
    expect(loadAccounts).toHaveBeenLastCalledWith({ page: 1, view: 'drivers' }, expect.any(AbortSignal));
  });
  it('does not fabricate totals or rows after a server failure', async () => {
    vi.mocked(loadAccounts).mockRejectedValue(new Error('fictional failure'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeEnabled();
  });
});
