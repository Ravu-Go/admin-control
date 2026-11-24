import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, MaskedField, type ConfirmedCommand } from './components';
import { LoadingState } from './States';

describe('controlled actions', () => {
  it('blocks stale versions and permission loss', async () => {
    const handler = vi.fn();
    const { rerender } = render(<ConfirmDialog title="Review" version={3} currentVersion={4} canConfirm onConfirm={handler} onCancel={vi.fn()}/>);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    rerender(<ConfirmDialog title="Review" version={4} currentVersion={4} canConfirm={false} onConfirm={handler} onCancel={vi.fn()}/>);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(handler).not.toHaveBeenCalled();
  });
  it('requires a reason, explicit confirmation and reuses idempotency on an unchanged retry', async () => {
    const user = userEvent.setup();
    const handler = vi.fn<(command: ConfirmedCommand) => Promise<void>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    render(<ConfirmDialog title="Review" version={3} currentVersion={3} canConfirm onConfirm={handler} onCancel={vi.fn()}/>);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(handler).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox'), 'Verified fictional evidence');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alert')).toHaveTextContent('Action was not confirmed');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(2));
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ version: 3, reason: 'Verified fictional evidence', confirmed: true });
    expect(handler.mock.calls[0]?.[0].idempotencyKey).toBe(handler.mock.calls[1]?.[0].idempotencyKey);
  });
  it('keeps sensitive fields masked with no permission', () => {
    render(<MaskedField label="Contact" maskedValue="+255 *** *** 014" version={1} currentVersion={1}/>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('+255 *** *** 014')).toBeVisible();
  });
  it('keeps the previous timestamp visible while loading without fabricated table rows', () => {
    render(<LoadingState previousTimestamp="09:40 EAT"/>);
    expect(screen.getByRole('status')).toHaveTextContent('09:40 EAT');
    expect(screen.queryByRole('row')).not.toBeInTheDocument();
  });
});
