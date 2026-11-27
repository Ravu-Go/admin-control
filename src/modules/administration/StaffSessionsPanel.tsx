import { useState } from 'react';
import type { Page, Session, Staff } from '../../api/staff-admin';
import { Button, Panel, StatusBadge } from '../../design/components';
import { Icon } from '../../design/Icon';
import { useAccessText } from './access-copy';
import { ListToolbar, Pager } from './ListToolbar';

type List<T> = { data?: Page<T> | undefined; isPending: boolean; error: unknown };
type Props = {
  people: List<Staff>; peopleQuery: string; onPeopleQuery: (value: string) => void; searching: boolean;
  me: string | undefined; selected: string; onSelect: (id: string) => void;
  sessions: List<Session>; onSessionsPage: (page: number) => void; canManage: boolean; onRevoke: (record: Session) => void;
  explain: (error: unknown) => string; time: (value: string) => string;
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase()).join('');

/** Pick a person on the left, review and end their sessions on the right. */
export function StaffSessionsPanel(props: Props) {
  const tr = useAccessText();
  const [filter, setFilter] = useState('active');
  const [now] = useState(() => Date.now());
  const ended = (record: Session) => record.revoked || new Date(record.expires_at).getTime() <= now;
  const people = (props.people.data?.data ?? []).filter(person => person.id !== props.me);
  const selectedName = props.selected === props.me ? tr('You') : props.people.data?.data.find(person => person.id === props.selected)?.display_name ?? tr('Staff member');
  const rows = (props.sessions.data?.data ?? []).filter(record => filter === 'all' || (filter === 'ended') === ended(record));
  const state = (record: Session) => record.revoked ? { tone: 'neutral' as const, label: tr('Revoked') }
    : ended(record) ? { tone: 'neutral' as const, label: tr('Expired') }
      : record.current ? { tone: 'success' as const, label: tr('This session') } : { tone: 'success' as const, label: tr('Active') };
  const person = (id: string, name: string, detail: string) => <li key={id}>
    <button type="button" className="person" aria-current={props.selected === id ? 'true' : undefined} onClick={() => { props.onSelect(id); setFilter('active'); }}>
      <span className="person-avatar" aria-hidden="true">{initials(name)}</span><span><strong>{name}</strong><small>{detail}</small></span>
    </button>
  </li>;
  return <Panel title={tr('Staff sessions')}>
    <div className="sessions-layout">
      <div className="sessions-people">
        <ListToolbar search={{ label: tr('Find staff'), placeholder: tr('Search by name'), value: props.peopleQuery, onChange: props.onPeopleQuery, clearLabel: tr('Clear search') }}/>
        <ul className="people-list" aria-label={tr('Choose a staff member')} aria-busy={props.searching}>
          {props.me && person(props.me, tr('You'), tr('This session'))}
          {people.map(row => person(row.id, row.display_name, row.email_masked))}
        </ul>
        {props.people.error ? <p role="alert" className="list-hint">{props.explain(props.people.error)}</p>
          : props.peopleQuery.trim() && !props.searching && people.length === 0 ? <p className="list-hint">{tr('No staff match this search.')}</p>
            : props.people.data && props.people.data.lastPage > 1 ? <p className="list-hint">{tr('Showing the first results. Refine the search to find others.')}</p> : null}
      </div>
      <section className="sessions-detail" aria-labelledby="sessions-person">
        <div className="sessions-detail-head">
          <h3 id="sessions-person">{selectedName}</h3>
          <ListToolbar filter={{ label: tr('Filter sessions'), value: filter, onChange: setFilter, options: [{ id: 'active', label: tr('Active') }, { id: 'ended', label: tr('Ended') }, { id: 'all', label: tr('All') }] }}/>
        </div>
        {props.sessions.isPending ? <p role="status" className="list-empty">{tr('Loading…')}</p> : props.sessions.error ? <p role="alert" className="list-empty">{props.explain(props.sessions.error)}</p>
          : !props.sessions.data?.data.length ? <p className="list-empty">{tr('No sessions for this staff member.')}</p>
            : rows.length === 0 ? <p className="list-empty">{tr('No sessions match this filter.')}</p>
              : <div className="access-table-scroll"><table className="sessions-table">
                <thead><tr><th scope="col">{tr('Session')}</th><th scope="col">{tr('Last active')}</th><th scope="col">{tr('Expires')}</th><th scope="col">{tr('Status')}</th><th scope="col"><span className="visually-hidden">{tr('Action')}</span></th></tr></thead>
                <tbody>{rows.map(record => {
                  const status = state(record);
                  return <tr key={record.id}>
                    <th scope="row"><span className="session-name"><Icon name="device" size={18}/><span><strong>{tr('Session')} {record.id}</strong><small>{tr('Started')} <time dateTime={record.created_at}>{props.time(record.created_at)}</time></small></span></span></th>
                    <td data-label={tr('Last active')}><time dateTime={record.last_activity_at}>{props.time(record.last_activity_at)}</time></td>
                    <td data-label={tr('Expires')}><time dateTime={record.expires_at}>{props.time(record.expires_at)}</time></td>
                    <td><StatusBadge status={status.tone} label={status.label}/></td>
                    <td className="session-action">{record.current ? <small>{tr('Use Sign out to end this session.')}</small>
                      : <Button kind="secondary" disabled={ended(record) || !props.canManage} onClick={() => props.onRevoke(record)}>{tr('Revoke…')}</Button>}</td>
                  </tr>;
                })}</tbody>
              </table></div>}
        {props.sessions.data && <Pager page={props.sessions.data.page} last={props.sessions.data.lastPage} onPage={props.onSessionsPage} labels={{ previous: tr('Previous'), next: tr('Next'), page: tr('Page'), of: tr('of') }}/>}
      </section>
    </div>
  </Panel>;
}
