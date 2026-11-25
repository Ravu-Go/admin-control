import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PasswordChange } from './PasswordChange';
import { changeStaffPassword, sendPasswordCode, StaffAuthError } from '../api/staff-auth';
import i18n from './i18n';
vi.mock('../api/staff-auth', async original => ({ ...await original<typeof import('../api/staff-auth')>(), sendPasswordCode: vi.fn(), changeStaffPassword: vi.fn() }));
beforeEach(() => { vi.mocked(sendPasswordCode).mockReset().mockResolvedValue({ expires_in: 600, resend_after: 60 }); vi.mocked(changeStaffPassword).mockReset().mockResolvedValue(); void i18n.changeLanguage('en'); });
afterEach(() => vi.useRealTimers());
async function send() { fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Fictional-current123!' } }); fireEvent.click(screen.getByRole('button', { name: 'Send email code' })); await screen.findByLabelText('Email verification code'); }
async function complete() {
  fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('New password', { exact: true }), { target: { value: 'Fictional-New123!' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Fictional-New123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm password change and sign out' }));
}
it('clears current password during sending, prevents duplicate requests and advances only on success', async () => {
  let finish!: (value: { expires_in: 600; resend_after: 60 }) => void;
  vi.mocked(sendPasswordCode).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<PasswordChange onChanged={vi.fn()}/>);
  const input = screen.getByLabelText('Current password'); fireEvent.change(input, { target: { value: 'Fictional-current123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send email code' }));
  expect(input).toHaveValue(''); expect(screen.queryByLabelText('Email verification code')).toBeNull();
  expect(screen.getByRole('button', { name: /Sending code/ })).toBeDisabled();
  await act(async () => finish({ expires_in: 600, resend_after: 60 }));
  expect(screen.getByLabelText('Email verification code')).toHaveFocus(); expect(sendPasswordCode).toHaveBeenCalledTimes(1);
});
it('supports paste and editing through one code input without auto-submitting', async () => {
  const user = userEvent.setup(); render(<PasswordChange onChanged={vi.fn()}/>); await send();
  const input = screen.getByLabelText('Email verification code'); await user.click(input); await user.paste('123 456');
  expect(input).toHaveValue('123456'); expect(changeStaffPassword).not.toHaveBeenCalled();
  await user.keyboard('{Backspace}'); expect(input).toHaveValue('12345');
});
it('requires a new current-password proof after the resend countdown', async () => {
  let current = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => current);
  render(<PasswordChange onChanged={vi.fn()}/>); await send();
  expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
  current += 61_000;
  await waitFor(() => expect(screen.getByRole('button', { name: 'Resend email code' })).toBeEnabled(), { timeout: 2000 });
  fireEvent.click(screen.getByRole('button', { name: 'Resend email code' }));
  expect(screen.getByLabelText('Current password')).toHaveFocus(); expect(sendPasswordCode).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Fictional-current123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Resend email code' }));
  await waitFor(() => expect(sendPasswordCode).toHaveBeenCalledTimes(2)); expect(screen.getByLabelText('Email verification code')).toHaveValue('');
  vi.restoreAllMocks();
});
it('clears code and new passwords before awaiting the response, then returns only on verified success', async () => {
  let finish!: () => void; const changed = vi.fn();
  vi.mocked(changeStaffPassword).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<PasswordChange onChanged={changed}/>); await send(); await complete();
  await waitFor(() => expect(changeStaffPassword).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Email verification code')).toHaveValue(''); expect(screen.getByLabelText('New password', { exact: true })).toHaveValue(''); expect(changed).not.toHaveBeenCalled();
  await act(async () => finish()); expect(changed).toHaveBeenCalledTimes(1);
});
it('shows rejected-code errors and keeps retry fields empty', async () => {
  vi.mocked(changeStaffPassword).mockRejectedValue(new StaffAuthError(422, 'request_failed'));
  const changed = vi.fn(); render(<PasswordChange onChanged={changed}/>); await send(); await complete();
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified'); expect(changed).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Email verification code')).toHaveValue('');
});
it('blocks expired code submission and offers resend', async () => {
  let current = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => current);
  render(<PasswordChange onChanged={vi.fn()}/>); await send(); current += 601_000;
  await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('expired'), { timeout: 2000 });
  expect(screen.getByRole('button', { name: 'Confirm password change and sign out' })).toBeDisabled(); expect(changeStaffPassword).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
it('aborts on unmount and ignores late completion', async () => {
  let finish!: () => void; let signal: AbortSignal | undefined; const changed = vi.fn();
  vi.mocked(changeStaffPassword).mockImplementation((_values, requestSignal) => { signal = requestSignal; return new Promise(resolve => { finish = resolve; }); });
  const { unmount } = render(<PasswordChange onChanged={changed}/>); await send(); await complete();
  await waitFor(() => expect(changeStaffPassword).toHaveBeenCalledTimes(1)); unmount(); expect(signal?.aborted).toBe(true);
  await act(async () => finish()); expect(changed).not.toHaveBeenCalled();
});
it('shows server failures without claiming code delivery and supports Swahili', async () => {
  vi.mocked(sendPasswordCode).mockRejectedValue(new StaffAuthError(429, 'request_failed'));
  render(<PasswordChange onChanged={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Fictional-current123!' } }); fireEvent.click(screen.getByRole('button', { name: 'Send email code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts'); expect(screen.queryByRole('status')).toBeNull();
  await act(async () => { await i18n.changeLanguage('sw'); });
  expect(screen.getByRole('heading', { name: 'Linda nenosiri lako' })).toBeVisible();
});
