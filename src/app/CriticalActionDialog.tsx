import { IdentityVerificationDialog } from '../design/IdentityVerificationDialog';
import { reauthenticateStaff, type StaffStepUp, type StaffStepUpRequest } from '../api/staff-auth';
import { useStaffSession } from './StaffSession';

/** Mount after reason/confirmation; contextKey must include object identity and opened version. */
export function CriticalActionDialog({ action, actionLabel, contextKey, onVerified, onCancel }: {
  action: StaffStepUpRequest['action']; actionLabel: string; contextKey: string;
  onVerified: (proof: StaffStepUp) => void; onCancel: () => void;
}) {
  const { session, clear } = useStaffSession();
  const deadline = session ? Math.min(Date.parse(session.session_expires_at), Date.parse(session.idle_expires_at)) : 0;
  return <IdentityVerificationDialog contextKey={JSON.stringify([session?.staff_id, session?.session_expires_at, action, contextKey])}
    actionLabel={actionLabel} canVerify={!!session?.permissions.includes(action)} deadline={deadline}
    verify={(credentials, signal) => reauthenticateStaff({ ...credentials, action }, signal)}
    onVerified={onVerified} onCancel={onCancel} onExpired={clear}/>;
}
