import { useTranslation } from 'react-i18next';
const en = {
  title: 'Welcome back', subtitle: 'Your Ravu system at a glance.', period: 'Reporting period', today: 'Today', week: 'Last 7 days', month: 'Last 30 days',
  area: 'Operating area', allAreas: 'All permitted areas', audience: 'Account type', allUsers: 'All users', riders: 'Clients', drivers: 'Drivers', partners: 'Partners',
  refresh: 'Refresh overview', export: 'Export report', exportUnavailable: 'Report exports will be available in Reports.',
  updated: 'Updated', refreshing: 'Refreshing…', refreshNote: 'Refreshes every minute',
  registered: 'Registered users', allTime: 'All-time', registrations: 'New registrations', periodLabel: 'Selected period',
  receipts: 'Membership receipts', settled: 'Settled annual membership payments', online: 'Drivers online now', eligible: 'Eligible for dispatch · current snapshot',
  registrationChart: 'User registrations', registrationDescription: 'New accounts per EAT calendar day', receiptDescription: 'Settled membership receipts · TZS millions per day',
  receiptNote: 'Excludes direct driver fares, pending payments and carrier fees.', breakdown: 'User breakdown', breakdownDescription: 'Registered accounts · current snapshot',
  users: 'users', unique: 'Unique account IDs', memberships: 'Active memberships', membershipDescription: 'Current active driver memberships', membershipNote: 'Share of active memberships · annual plans',
  recent: 'Recent registrations', recentDescription: 'Newest first · current snapshot', phoneVerified: 'Phone verified', emailVerified: 'Email verified', pending: 'Contact verification pending',
  empty: 'No registrations yet', noData: 'No records in this period', unavailable: 'Overview unavailable', retry: 'Try again', denied: 'You do not have access to this overview.',
  stale: 'Showing the last successful snapshot. Refresh failed.', date: 'Date', total: 'Total', amount: 'Membership receipts (TZS)',
};
const sw: typeof en = {
  title: 'Karibu tena', subtitle: 'Muhtasari wa mfumo wako wa Ravu.', period: 'Kipindi cha ripoti', today: 'Leo', week: 'Siku 7 zilizopita', month: 'Siku 30 zilizopita',
  area: 'Eneo la huduma', allAreas: 'Maeneo yote yanayoruhusiwa', audience: 'Aina ya akaunti', allUsers: 'Watumiaji wote', riders: 'Wateja', drivers: 'Madereva', partners: 'Washirika',
  refresh: 'Sasisha muhtasari', export: 'Pakua ripoti', exportUnavailable: 'Upakuaji wa ripoti utapatikana katika Ripoti.',
  updated: 'Imesasishwa', refreshing: 'Inasasishwa…', refreshNote: 'Inasasishwa kila dakika',
  registered: 'Watumiaji waliosajiliwa', allTime: 'Tangu mwanzo', registrations: 'Usajili mpya', periodLabel: 'Kipindi kilichochaguliwa',
  receipts: 'Mapato ya uanachama', settled: 'Malipo ya mwaka ya uanachama yaliyothibitishwa', online: 'Madereva mtandaoni sasa', eligible: 'Wanastahili safari · hali ya sasa',
  registrationChart: 'Usajili wa watumiaji', registrationDescription: 'Akaunti mpya kwa kila siku ya EAT', receiptDescription: 'Malipo ya uanachama yaliyothibitishwa · milioni TZS kwa siku',
  receiptNote: 'Haijumuishi nauli za madereva, malipo yanayosubiri na ada za mtoa huduma.', breakdown: 'Mgawanyo wa watumiaji', breakdownDescription: 'Akaunti zilizosajiliwa · hali ya sasa',
  users: 'watumiaji', unique: 'Vitambulisho vya kipekee vya akaunti', memberships: 'Uanachama unaotumika', membershipDescription: 'Uanachama wa madereva unaotumika sasa', membershipNote: 'Sehemu ya uanachama unaotumika · mipango ya mwaka',
  recent: 'Usajili wa hivi karibuni', recentDescription: 'Mpya kwanza · hali ya sasa', phoneVerified: 'Simu imethibitishwa', emailVerified: 'Barua pepe imethibitishwa', pending: 'Mawasiliano yanasubiri uthibitisho',
  empty: 'Hakuna usajili bado', noData: 'Hakuna rekodi katika kipindi hiki', unavailable: 'Muhtasari haupatikani', retry: 'Jaribu tena', denied: 'Huna ruhusa ya kuona muhtasari huu.',
  stale: 'Unaona taarifa za mwisho zilizopatikana. Usasishaji umeshindikana.', date: 'Tarehe', total: 'Jumla', amount: 'Malipo ya uanachama (TZS)',
};
export function useOverviewCopy() { const { i18n } = useTranslation(); return { copy: i18n.language === 'sw' ? sw : en, language: i18n.language === 'sw' ? 'sw' as const : 'en' as const }; }
