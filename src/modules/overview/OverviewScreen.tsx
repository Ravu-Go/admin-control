import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { loadOverview, overviewPeriod } from '../../api/overview';
import { StaffAuthError } from '../../api/staff-auth';
import { useStaffSession } from '../../app/StaffSession';
import { Button, KpiCard, Panel } from '../../design/components';
import { Icon } from '../../design/Icon';
import { LoadingState } from '../../design/States';
import { useOverviewCopy } from './overview-copy';
import './OverviewScreen.css';

export function OverviewScreen() {
  const { copy, language } = useOverviewCopy();
  const { clear } = useStaffSession();
  const [params, setParams] = useSearchParams();
  const days = ['1','7','30'].includes(params.get('period') ?? '') ? Number(params.get('period')) : 7;
  const audience = params.get('audience') === 'rider' ? 'rider' : params.get('audience') === 'driver' ? 'driver' : params.get('audience') === 'partner' ? 'partner' : 'both';
  const area = /^\d+$/.test(params.get('area_id') ?? '') ? params.get('area_id')! : '';
  const range = overviewPeriod(days);
  const result = useQuery({ queryKey: ['overview', range.from, range.to, area, audience],
    queryFn: ({ signal }) => loadOverview({ ...range, audience, ...(area ? { area_id: area } : {}) }, signal),
    retry: false, refetchInterval: 60_000, refetchOnWindowFocus: true,
  });
  const denied = result.error instanceof StaffAuthError && result.error.status === 403;
  const expired = result.error instanceof StaffAuthError && result.error.status === 401;
  useEffect(() => { if (expired) clear(); }, [expired, clear]);
  function change(key: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; });
  }
  const report = result.data?.report;
  const number = new Intl.NumberFormat(language === 'sw' ? 'sw-TZ' : 'en-TZ');
  const money = (minor: number) => new Intl.NumberFormat(language === 'sw' ? 'sw-TZ' : 'en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0, notation: 'compact', maximumSignificantDigits: 3 }).format(minor / 100);
  const date = (value: string) => new Intl.DateTimeFormat(language === 'sw' ? 'sw-TZ' : 'en-TZ', { timeZone: 'Africa/Dar_es_Salaam', day: 'numeric', month: 'short' }).format(new Date(value));
  const time = (value: string) => new Intl.DateTimeFormat(language === 'sw' ? 'sw-TZ' : 'en-TZ', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value));
  const metric = (key: string) => report?.metrics.find(item => item.key === key);
  const count = (key: string) => { const item = metric(key); return item?.availability === 'available' && item.numerator !== null ? number.format(item.numerator) : '—'; };
  const receipts = metric('membership_receipts');
  const breakdown = report ? [{ name: copy.riders, count: report.user_breakdown.riders }, { name: copy.drivers, count: report.user_breakdown.drivers }, { name: copy.partners, count: report.user_breakdown.partners }] : [];
  const totalUsers = breakdown.reduce((sum, item) => sum + item.count, 0);
  const totalMemberships = report?.memberships.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const percentage = (value: number, total: number) => total ? new Intl.NumberFormat(language === 'sw' ? 'sw-TZ' : 'en-TZ', { style: 'percent', maximumFractionDigits: 0 }).format(value / total) : '—';
  const chart = report?.daily.map(day => ({ ...day, label: date(`${day.date}T00:00:00+03:00`), receipts: day.membership_receipts_minor / 100_000_000 })) ?? [];

  return <div className="overview-screen">
    <div className="overview-heading"><h1>{copy.title}</h1><p>{copy.subtitle} · {date(range.from)}–{date(new Date(Date.parse(range.to) - 1).toISOString())} · EAT</p></div>
    <div className="overview-filters">
      <label><span className="sr-only">{copy.period}</span><select aria-label={copy.period} value={days} onChange={event => change('period', event.target.value)}><option value="1">{copy.today}</option><option value="7">{copy.week}</option><option value="30">{copy.month}</option></select></label>
      <label><span className="sr-only">{copy.area}</span><select aria-label={copy.area} value={area} onChange={event => change('area_id', event.target.value)}><option value="">{copy.allAreas}</option>{report?.areas.map(item => <option key={item.id} value={item.id}>{item.name[language]}</option>)}</select></label>
      <label><span className="sr-only">{copy.audience}</span><select aria-label={copy.audience} value={audience} onChange={event => change('audience', event.target.value)}><option value="both">{copy.allUsers}</option><option value="rider">{copy.riders}</option><option value="driver">{copy.drivers}</option><option value="partner">{copy.partners}</option></select></label>
      <div className="overview-freshness" role="status"><strong>{result.isFetching ? copy.refreshing : copy.refreshNote}</strong>{result.data && <small>{copy.updated} {time(result.data.updatedAt)} EAT</small>}</div>
      <Button kind="secondary" aria-label={copy.refresh} disabled={result.isFetching} onClick={() => void result.refetch()}>{copy.refresh}</Button>
      <Button kind="secondary" disabled title={copy.exportUnavailable}>{copy.export}</Button>
    </div>
    {result.isPending ? <LoadingState previousTimestamp={null}/> : denied || expired || !report ? <Panel title={copy.unavailable}><p role="alert">{denied ? copy.denied : copy.unavailable}</p><Button onClick={() => void result.refetch()}>{copy.retry}</Button></Panel> : <>
      {result.isError && <p role="alert" className="overview-stale">{copy.stale}</p>}
      <div className="overview-kpis">
        <KpiCard label={copy.registered} value={count('registered_users')} context={copy.allTime} detail={`${number.format(report.user_breakdown.riders)} ${copy.riders.toLowerCase()} · ${number.format(report.user_breakdown.drivers)} ${copy.drivers.toLowerCase()} · ${number.format(report.user_breakdown.partners)} ${copy.partners.toLowerCase()}`}/>
        <KpiCard label={copy.registrations} value={count('registrations')} context={copy.periodLabel} detail={copy.registrationDescription}/>
        <KpiCard label={copy.receipts} value={receipts?.availability === 'available' && receipts.amount ? money(receipts.amount.amount_minor) : null} context={copy.periodLabel} detail={`${count('membership_receipts')} · ${copy.settled}`}/>
        <KpiCard label={copy.online} value={count('eligible_online_drivers')} context={copy.updated} detail={copy.eligible}/>
      </div>
      <div className="overview-charts">
        <Panel title={copy.registrationChart} description={copy.registrationDescription}><div className="overview-chart" role="img" aria-label={copy.registrationChart}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} accessibilityLayer margin={{ left: -20, right: 12, top: 16 }}><CartesianGrid vertical={false} stroke="var(--color-line)"/><XAxis dataKey="label" tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false}/><Tooltip/><Bar dataKey="riders" name={copy.riders} stackId="registrations" isAnimationActive={false} fill="var(--color-blue)"/><Bar dataKey="drivers" name={copy.drivers} stackId="registrations" isAnimationActive={false} fill="var(--color-navy)"/><Bar dataKey="partners" name={copy.partners} stackId="registrations" isAnimationActive={false} fill="var(--color-sky)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div><ul className="overview-legend">{[[copy.riders, 'var(--color-blue)'], [copy.drivers, 'var(--color-navy)'], [copy.partners, 'var(--color-sky)']].map(([name, color]) => <li key={name}><span style={{ background: color }} aria-hidden="true"/>{name}</li>)}</ul></Panel>
        <Panel title={copy.receipts} description={copy.receiptDescription} info={copy.receiptNote}><div className="overview-chart" role="img" aria-label={copy.receipts}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={chart} accessibilityLayer margin={{ left: -20, right: 12, top: 16 }}><CartesianGrid vertical={false} stroke="var(--color-line)"/><XAxis dataKey="label" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><Tooltip/><Line dataKey="receipts" name={copy.receipts} stroke="var(--color-blue)" strokeWidth={3} dot={{ fill: 'var(--color-white)', r: 4 }} isAnimationActive={false}/></LineChart></ResponsiveContainer>
        </div></Panel>
      </div>
      <div className="sr-only"><table><caption>{copy.periodLabel}</caption><thead><tr><th>{copy.date}</th><th>{copy.riders}</th><th>{copy.drivers}</th><th>{copy.partners}</th><th>{copy.amount}</th></tr></thead><tbody>{report.daily.map(day => <tr key={day.date}><th>{day.date}</th><td>{day.riders}</td><td>{day.drivers}</td><td>{day.partners}</td><td>{day.membership_receipts_minor / 100}</td></tr>)}</tbody></table></div>
      <div className="overview-bottom">
        <Panel title={copy.breakdown} description={copy.breakdownDescription} info={copy.unique}><div className="overview-breakdown"><div className="overview-donut" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer={false}><Pie rootTabIndex={-1} data={breakdown} dataKey="count" innerRadius={39} outerRadius={52} stroke="none" isAnimationActive={false}>{breakdown.map((item, index) => <Cell key={item.name} fill={['var(--color-blue)', 'var(--color-navy)', 'var(--color-sky)'][index] ?? 'var(--color-sky)'}/>)}</Pie></PieChart></ResponsiveContainer><span><strong>{number.format(totalUsers)}</strong><small>{copy.users}</small></span></div><ul>{breakdown.map(item => <li key={item.name}><strong>{item.name}</strong><span>{number.format(item.count)} · {percentage(item.count, totalUsers)}</span></li>)}</ul></div></Panel>
        <Panel title={copy.memberships} description={`${number.format(totalMemberships)} · ${copy.membershipDescription}`} info={copy.membershipNote}><ul className="overview-memberships">{report.memberships.map(item => <li key={item.code}><div><strong>{item.code}</strong><span>{number.format(item.count)} · {percentage(item.count, totalMemberships)}</span></div><progress max={Math.max(totalMemberships, 1)} value={item.count} aria-label={item.code}/></li>)}</ul></Panel>
        <Panel title={copy.recent} description={copy.recentDescription}>{report.recent_registrations.length === 0 ? <p>{copy.empty}</p> : <ul className="overview-recent">{report.recent_registrations.map(item => <li key={item.id}><Icon name="account"/><div><strong>{item.kind === 'driver' ? copy.drivers : item.kind === 'partner' ? copy.partners : copy.riders} · {item.id}</strong><small>{item.phone_verified ? copy.phoneVerified : item.email_verified ? copy.emailVerified : copy.pending}</small></div><time dateTime={item.created_at}>{time(item.created_at)}</time></li>)}</ul>}</Panel>
      </div>
    </>}
  </div>;
}
