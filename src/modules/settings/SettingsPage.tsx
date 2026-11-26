import { useTranslation } from 'react-i18next';
import { Button, Panel } from '../../design/components';
import { NotConnected } from '../../design/NotConnected';
import { PageHeader } from '../../design/PageHeader';
import { Tabs, TabPanel, useQueryChoice } from '../../design/Tabs';
import { SystemSettingsScreen } from './SystemSettingsScreen';

const settingsTabs = ['dispatch', 'integrations', 'policies', 'app'] as const;
type SettingsTab = typeof settingsTabs[number];

/** A24: each tab renders only its own panel, and the selected tab lives in ?tab= so reloads and links keep it. */
export function SettingsPage() {
  const { i18n } = useTranslation();
  const sw = i18n.language.startsWith('sw');
  const text = (en: string, translation: string) => sw ? translation : en;
  // App configuration is the only connected area, so it is where a plain visit lands.
  const [tab, setTab] = useQueryChoice<SettingsTab>('tab', settingsTabs, 'app');
  const labels: Record<SettingsTab, string> = {
    dispatch: text('Dispatch and areas', 'Usafirishaji na maeneo'), integrations: text('Integrations', 'Miunganisho'),
    policies: text('Policies', 'Sera'), app: text('App configuration', 'Usanidi wa programu'),
  };
  const notConnected = text('Not connected yet', 'Bado haijaunganishwa');
  return <div className="system-settings-page">
    <PageHeader title={text('System settings and integrations', 'Mipangilio ya mfumo na miunganisho')}
      subtitle={text('Draft configuration · No secrets displayed · Publishing needs permission, a reason and confirmation', 'Usanidi wa rasimu · Hakuna siri zinazoonyeshwa · Kuchapisha kunahitaji ruhusa, sababu na uthibitisho')}
      meta={<span className="header-chip" id="settings-publish-state">{text('Publishing not connected', 'Uchapishaji haujaunganishwa')}</span>}
      action={<Button icon="compare" disabled aria-describedby="settings-publish-state">{text('Review changes…', 'Hakiki mabadiliko…')}</Button>}
      tabs={<Tabs idPrefix="settings" label={text('System settings sections', 'Sehemu za mipangilio ya mfumo')} value={tab} onChange={id => setTab(id as SettingsTab)} items={settingsTabs.map(id => ({ id, label: labels[id] }))}/>}/>
    <TabPanel idPrefix="settings" id={tab}>
      {tab === 'dispatch' && <Panel title={labels.dispatch}><NotConnected title={notConnected}>{text('Operating areas, vehicle types and tariffs will be drafted and published here once the configuration API is connected. Nothing is shown until then.', 'Maeneo ya huduma, aina za magari na nauli zitaandaliwa na kuchapishwa hapa API ya usanidi ikiunganishwa. Hakuna kinachoonyeshwa hadi wakati huo.')}</NotConnected></Panel>}
      {tab === 'integrations' && <Panel title={text('Integration status', 'Hali ya miunganisho')}><NotConnected title={notConnected}>{text('Mobile money, card payments, authentication, verification, WhatsApp and maps will show Connected, Degraded or Not connected once the integrations API is connected. No status is guessed.', 'Pesa kwa simu, malipo ya kadi, uthibitishaji, WhatsApp na ramani zitaonyesha hali halisi API ya miunganisho ikiunganishwa. Hakuna hali inayokisiwa.')}</NotConnected></Panel>}
      {tab === 'policies' && <Panel title={text('Operational policies', 'Sera za uendeshaji')}><NotConnected title={notConnected}>{text('Review targets, membership grace, SOS routing and EN/SW content policies will be drafted here and need business and legal review before publishing.', 'Malengo ya uhakiki, muda wa neema wa uanachama, njia za SOS na sera za maudhui zitaandaliwa hapa na zinahitaji uhakiki wa kibiashara na kisheria kabla ya kuchapishwa.')}</NotConnected></Panel>}
      {tab === 'app' && <SystemSettingsScreen/>}
    </TabPanel>
  </div>;
}
