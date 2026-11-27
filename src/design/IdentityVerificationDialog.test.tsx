import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentityVerificationDialog } from './IdentityVerificationDialog';
import { StaffAuthError } from '../api/staff-auth';

function pending() { let complete!: (value: string) => void; const promise = new Promise<string>(resolve => { complete = resolve; }); return { promise, complete }; }
const props = () => ({ contextKey: 'refund:fictional:version-1', canVerify: true, deadline: Date.now() + 60_000, actionLabel: 'Approve fictional refund', onCancel: vi.fn(), onVerified: vi.fn() });
// Six digits submit the form on their own once the password is filled.
async function fill() { const user = userEvent.setup(); await user.type(screen.getByLabelText('Current password'), 'Fictional-password'); await user.type(screen.getByLabelText('Verification code'), '123456'); return user; }

describe('identity verification boundary', () => {
  it('clears credentials while pending, blocks duplicate requests and never persists them', async () => {
    const job = pending(); const verify = vi.fn(() => job.promise); const options = props(); const storage = vi.spyOn(Storage.prototype, 'setItem');
    render(<IdentityVerificationDialog {...options} verify={verify}/>);
    await fill();
    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Current password')).toHaveValue(''); expect(screen.getByLabelText('Verification code')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Verifying/ })).toBeDisabled();
    expect(options.onVerified).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
    job.complete('verified'); await waitFor(() => expect(options.onVerified).toHaveBeenCalledWith('verified')); storage.mockRestore();
  });
  it('cancellation aborts pending verification and suppresses a late result', async () => {
    const job = pending(); const verify = vi.fn<(credentials: unknown, signal: AbortSignal) => Promise<string>>(() => job.promise); const options = props();
    render(<IdentityVerificationDialog {...options} verify={verify}/>);
    const user = await fill();
    await waitFor(() => expect(verify).toHaveBeenCalledOnce()); await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(verify.mock.calls[0]?.[1].aborted).toBe(true); expect(options.onCancel).toHaveBeenCalledOnce();
    await act(async () => { job.complete('late'); }); expect(screen.getByLabelText('Current password')).toHaveValue(''); expect(options.onVerified).not.toHaveBeenCalled();
  });
  it.each(['context', 'permission', 'expiry'] as const)('blocks a late result after %s changes', async change => {
    const job = pending(); const verify = vi.fn(() => job.promise); const options = props();
    const { rerender } = render(<IdentityVerificationDialog {...options} verify={verify}/>);
    await fill(); await waitFor(() => expect(verify).toHaveBeenCalledOnce());
    rerender(<IdentityVerificationDialog {...options} verify={verify} contextKey={change === 'context' ? 'refund:other:version-2' : options.contextKey} canVerify={change !== 'permission'} deadline={change === 'expiry' ? 0 : options.deadline}/>);
    await act(async () => { job.complete('late'); }); expect(screen.getByRole('alert')).toBeVisible(); expect(options.onVerified).not.toHaveBeenCalled();
  });
  it('submits by itself once six digits follow a password, and never with the password missing', async () => {
    const verify = vi.fn().mockResolvedValue({ action: 'refunds.approve', expires_at: '2099-01-01T00:00:00Z' }); render(<IdentityVerificationDialog {...props()} verify={verify}/>);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Verification code'), '123456');
    expect(verify).not.toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull();
    await user.type(screen.getByLabelText('Current password'), 'Fictional-password');
    expect(verify).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Verification code')); await user.type(screen.getByLabelText('Verification code'), '654321');
    await waitFor(() => expect(verify).toHaveBeenCalledOnce());
    expect(verify.mock.calls[0]?.[0]).toMatchObject({ password: 'Fictional-password', code: '654321' });
  });
  it('does not send invalid fields and handles Escape as cancellation', async () => {
    const verify = vi.fn(); const options = props(); render(<IdentityVerificationDialog {...options} verify={verify}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' })); await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2)); expect(verify).not.toHaveBeenCalled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); expect(options.onCancel).toHaveBeenCalledOnce();
  });
  it.each([422,403,429,503,419])('fails closed and clears credentials for status %i', async status => {
    const verify = vi.fn().mockRejectedValue(new StaffAuthError(status, 'request_failed')); const options = props(); const expired = vi.fn();
    render(<IdentityVerificationDialog {...options} verify={verify} onExpired={expired}/>);
    await fill(); await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(options.onVerified).not.toHaveBeenCalled(); expect(screen.getByLabelText('Current password')).toHaveValue(''); expect(screen.getByLabelText('Verification code')).toHaveValue('');
    expect(expired).toHaveBeenCalledTimes(status === 419 ? 1 : 0);
  });
});
