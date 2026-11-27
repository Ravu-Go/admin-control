import { useState } from 'react';
import type { AccessRequest, Area, Invitation, Page, Role } from '../../api/staff-admin';
import { Button, Panel, StatusBadge } from '../../design/components';
import { Icon } from '../../design/Icon';
import { useAccessText } from './access-copy';
import { ListToolbar, Pager, matches } from './ListToolbar';

type List<T> = { data?: Page<T> | undefined; isPending: boolean; error: unknown };
type Props = {
  requests: List<AccessRequest>; requestStatus: string; onRequestStatus: (status: string) => void; onRequestsPage: (page: number) => void;
  invitations: List<Invitation>; onInvitationsPage: (page: number) => void;
  roles: Role[]; areas: Area[]; me: string | undefined; superAdmin: boolean; canApprove: boolean; canManage: boolean;
  onReview: (record: AccessRequest, decision: 'approve' | 'reject') => void; onResend: (record: Invitation) => void; onRevoke: (record: Invitation) => void;
  explain: (error: unknown) => string; time: (value: string) => string;
};
const kindIcon = { invite: 'user-plus', staff: 'account', role: 'shield', account_closure: 'alert' } as const;
const requestTone = { pending: 'pending', approved: 'success', rejected: 'neutral' } as const;
const invitationTone = { pending: 'pending', accepted: 'success', expired: 'neutral', revoked: 'neutral' } as const;

/** A23-style review queue: each request reads as subject, proposed change, reason and decision on one row. */
export function AccessRequestsPanel(props: Props) {
  const tr = useAccessText();
  const [query, setQuery] = useState('');
  const [invitationFilter, setInvitationFilter] = useState('open');
  const pagerLabels = { previous: tr('Previous'), next: tr('Next'), page: tr('Page'), of: tr('of') };
  const statusLabel = (status: string) => tr(status.charAt(0).toUpperCase() + status.slice(1));
  const kindLabel = { invite: tr('New staff invitation'), staff: tr('Staff access change'), role: tr('Role change'), account_closure: tr('Account deletion') };
  const scope = (record: AccessRequest) => record.summary.scope?.kind === 'global' ? tr('All operations')
    : record.summary.scope?.area_id ? areas(record.summary.scope.area_id) : null;
  const areas = (id: string | number) => props.areas.find(area => area.id === String(id))?.label ?? String(id);
  const rows = (props.requests.data?.data ?? []).filter(record => (!props.requestStatus || record.status === props.requestStatus)
    && matches(query, record.summary.name, record.summary.email_masked, record.reason));
  const invitations = (props.invitations.data?.data ?? []).filter(record => invitationFilter === 'all' || ['pending', 'expired'].includes(record.status));
  return <>
    <Panel title={tr('Access requests')} className="requests-panel">
      <ListToolbar search={{ label: tr('Search this page'), placeholder: tr('Search this page'), value: query, onChange: setQuery, clearLabel: tr('Clear search') }}
        filter={{ label: tr('Filter requests'), value: props.requestStatus, onChange: props.onRequestStatus, options: [{ id: 'pending', label: tr('Pending') }, { id: 'approved', label: tr('Approved') }, { id: 'rejected', label: tr('Rejected') }, { id: '', label: tr('All') }] }}
        count={props.requests.data ? `${rows.length} ${tr('of')} ${props.requests.data.total}` : undefined}/>
      {props.requests.isPending ? <p role="status" className="list-empty">{tr('Loading…')}</p> : props.requests.error ? <p role="alert" className="list-empty">{props.explain(props.requests.error)}</p>
        : rows.length === 0 ? <p className="list-empty">{tr(props.requestStatus === 'pending' && !query ? 'No pending requests.' : 'No requests match these filters.')}</p>
          : <ul className="request-list">{rows.map(record => {
            const own = record.requested_by === props.me;
            const needsOwner = record.kind === 'account_closure' && !props.superAdmin;
            const blocked = !props.canApprove || needsOwner || (own && !props.superAdmin);
            const role = record.summary.role_id ? props.roles.find(item => item.id === record.summary.role_id)?.name ?? record.summary.role_id : null;
            const where = scope(record);
            return <li className="request-row" key={record.id}>
              <div className="request-subject">
                <span className="request-kind" aria-hidden="true"><Icon name={kindIcon[record.kind]} size={18}/></span>
                <div><strong>{record.summary.name}</strong><span>{kindLabel[record.kind]}{record.summary.email_masked ? ` · ${record.summary.email_masked}` : ''}</span></div>
              </div>
              <StatusBadge status={requestTone[record.status]} label={statusLabel(record.status)}/>
              <dl className="request-facts">
                {role && <div><dt>{tr('Role')}</dt><dd>{role}</dd></div>}
                {where && <div><dt>{tr('Scope')}</dt><dd>{where}</dd></div>}
                {record.kind === 'account_closure' && <div><dt>{tr('On approval')}</dt><dd>{tr('Account deleted (archived). Trip, payment and audit history kept.')}</dd></div>}
                <div><dt>{tr('Requested')}</dt><dd><time dateTime={record.created_at}>{props.time(record.created_at)}</time>{own && <small>{tr('Requested by you')}</small>}</dd></div>
                <div className="request-wide"><dt>{tr('Reason')}</dt><dd>{record.reason}</dd></div>
                {record.summary.permissions && <div className="request-wide"><dt>{tr('Capabilities')}</dt><dd><ul className="request-chips">{record.summary.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul><small>{tr(record.summary.enabled ? 'Enabled on approval' : 'Stays disabled')}</small></dd></div>}
              </dl>
              {record.status === 'pending' && <div className="request-actions">
                {needsOwner ? <small>{tr('Only a super administrator can approve account deletion.')}</small>
                  : own && !props.superAdmin && <small>{tr('Another administrator must review your request.')}</small>}
                <Button kind="secondary" disabled={blocked} onClick={() => props.onReview(record, 'reject')}>{tr('Reject…')}</Button>
                <Button kind="secondary" icon="check" disabled={blocked} onClick={() => props.onReview(record, 'approve')}>{tr('Approve…')}</Button>
              </div>}
            </li>;
          })}</ul>}
      {props.requests.data && <Pager page={props.requests.data.page} last={props.requests.data.lastPage} onPage={props.onRequestsPage} labels={pagerLabels}/>}
    </Panel>
    <Panel title={tr('Staff invitations')} className="requests-panel">
      <ListToolbar filter={{ label: tr('Filter invitations'), value: invitationFilter, onChange: setInvitationFilter, options: [{ id: 'open', label: tr('Needs action') }, { id: 'all', label: tr('All') }] }}
        count={props.invitations.data ? `${invitations.length} ${tr('of')} ${props.invitations.data.total}` : undefined}/>
      {props.invitations.isPending ? <p role="status" className="list-empty">{tr('Loading…')}</p> : props.invitations.error ? <p role="alert" className="list-empty">{props.explain(props.invitations.error)}</p>
        : !props.invitations.data?.data.length ? <p className="list-empty">{tr('No staff invitations.')}</p>
          : invitations.length === 0 ? <p className="list-empty">{tr('No invitations match this filter.')}</p>
            : <ul className="request-list">{invitations.map(record => <li className="request-row invitation-row" key={record.id}>
              <div className="request-subject">
                <span className="request-kind" aria-hidden="true"><Icon name="bell" size={18}/></span>
                <div><strong>{record.email_masked}</strong><span>{record.role_id ? props.roles.find(role => role.id === record.role_id)?.name ?? record.role_id : tr('Unassigned')}</span></div>
              </div>
              <StatusBadge status={invitationTone[record.status]} label={statusLabel(record.status)}/>
              <dl className="request-facts"><div><dt>{tr('Expires')}</dt><dd><time dateTime={record.expires_at}>{props.time(record.expires_at)}</time></dd></div></dl>
              <div className="request-actions">
                <Button kind="secondary" disabled={record.status !== 'pending' || !props.canManage} onClick={() => props.onRevoke(record)}>{tr('Revoke…')}</Button>
                <Button kind="secondary" disabled={!['pending', 'expired'].includes(record.status) || !props.canManage} onClick={() => props.onResend(record)}>{tr('Resend…')}</Button>
              </div>
            </li>)}</ul>}
      {props.invitations.data && <Pager page={props.invitations.data.page} last={props.invitations.data.lastPage} onPage={props.onInvitationsPage} labels={pagerLabels}/>}
    </Panel>
  </>;
}
