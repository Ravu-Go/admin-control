import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { signInStaff, verifyStaffMfa, setupStaffMfa, StaffAuthError } from '../api/staff-auth';
import i18n from './i18n';

vi.mock('./StaffSession', () => ({ useStaffSession: () => ({ session: null, checking: false, unavailable: false, refresh: vi.fn().mockResolvedValue(true) }) }));
vi.mock('../api/staff-auth', async original => ({ ...await original<typeof import('../api/staff-auth')>(), signInStaff: vi.fn(), verifyStaffMfa: vi.fn(), setupStaffMfa: vi.fn() }));
beforeEach(() => { vi.mocked(signInStaff).mockReset().mockResolvedValue({ state: 'mfa_required', staff_id: null, absolute_expires_at: null }); vi.mocked(verifyStaffMfa).mockReset(); vi.mocked(setupStaffMfa).mockReset(); void i18n.changeLanguage('en'); });
async function signIn() {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'staff@example.test' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'Fictional-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('heading', { name: 'Verify your sign-in' });
}
it.each([401, 419])('returns expired MFA HTTP %s to password sign-in without a reload', async status => {
  vi.mocked(verifyStaffMfa).mockRejectedValueOnce(new StaffAuthError(status, 'request_failed'));
  render(<MemoryRouter><LoginPage/></MemoryRouter>);await signIn();
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
  await screen.findByRole('heading', { name: 'Sign in to Ravu' });
  expect(screen.getByRole('alert')).toHaveTextContent('session expired');
  expect(screen.getByLabelText('Email address')).toHaveValue('staff@example.test');
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
  expect(screen.queryByLabelText('Verification code')).toBeNull();
  await signIn(); expect(signInStaff).toHaveBeenCalledTimes(2);
});
it('keeps an incorrect authenticator code on the MFA screen', async () => {
  vi.mocked(verifyStaffMfa).mockRejectedValueOnce(new StaffAuthError(422, 'request_failed'));
  render(<MemoryRouter><LoginPage/></MemoryRouter>);await signIn();
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '000000' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
  expect(screen.getByRole('heading', { name: 'Verify your sign-in' })).toBeVisible();
  expect(screen.getByLabelText('Verification code')).toHaveValue('');
});
it('expired enrollment setup returns to sign-in and clears the enrollment step', async () => {
  vi.mocked(signInStaff).mockResolvedValue({ state: 'enrollment_required', staff_id: null, absolute_expires_at: null });
  vi.mocked(setupStaffMfa).mockRejectedValue(new StaffAuthError(401, 'unauthenticated'));
  render(<MemoryRouter><LoginPage/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'staff@example.test' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'Fictional-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }));
  await screen.findByRole('heading', { name: 'Sign in to Ravu' });
  expect(screen.getByRole('alert')).toHaveTextContent('session expired');
  expect(screen.queryByRole('button', { name: 'Set up authenticator' })).toBeNull();
});
