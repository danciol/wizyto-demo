// ═══════════════════════════════════════════════════════════════
//  DEFINICJA PLANÓW — edytuj w panelu super-admina
//  Ten plik jest generowany automatycznie przez panel
// ═══════════════════════════════════════════════════════════════

export type FeatureKey =
  | 'dashboard'
  | 'calendar'
  | 'appointments'
  | 'employees'
  | 'clients'
  | 'messages'
  | 'online_booking'
  | 'deposits'
  | 'reports'
  | 'phone_protection'
  | 'gallery'
  | 'services'
  | 'no_show_stats'
  | 'client_history'
  | 'time_blocks'
  | 'employee_sms_notify';

export interface PlanDefinition {
  id: string;
  name: string;
  price: number;        // cena założycielska (netto / mies.) przez pierwsze 12 miesięcy
  priceAfter: number;   // cena po 12 miesiącach
  maxStaff: number | null; // osoby w kalendarzu, null = bez limitu
  features: FeatureKey[];
}

const DUET_FEATURES: FeatureKey[] = [
  'dashboard','calendar','appointments','employees','clients','services','gallery',
  'online_booking','messages','deposits',
];
const SALON_FEATURES: FeatureKey[] = [...DUET_FEATURES, 'reports','no_show_stats','client_history'];
const SALON_PRO_FEATURES: FeatureKey[] = [...SALON_FEATURES, 'time_blocks','employee_sms_notify','phone_protection'];

export const PLANS: PlanDefinition[] = [
  { id: 'trial',     name: 'Okres próbny 14 dni', price: 0,   priceAfter: 0,   maxStaff: null, features: SALON_PRO_FEATURES },
  { id: 'duet',      name: 'Duet',                price: 49,  priceAfter: 69,  maxStaff: 2,    features: DUET_FEATURES },
  { id: 'salon',     name: 'Salon',               price: 99,  priceAfter: 129, maxStaff: 5,    features: SALON_FEATURES },
  { id: 'salon_pro', name: 'Salon Pro',           price: 149, priceAfter: 179, maxStaff: null, features: SALON_PRO_FEATURES },
];

// Identyfikatory sprzed zmiany cennika (październik 2026), wciąż zapisane w bazie super-admina
const LEGACY_PLAN_IDS: Record<string, string> = {
  test: 'trial',
  standard: 'duet',
  standard_plus: 'duet',
  pro: 'salon_pro',
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard: '📊 Dashboard',
  calendar: '📅 Kalendarz',
  appointments: '📋 Wizyty',
  employees: '👥 Pracownicy',
  clients: '👤 Klienci',
  services: '✂️ Usługi',
  messages: '💬 Wiadomości SMS',
  online_booking: '🌐 Rezerwacja online',
  deposits: '💳 Zaliczki',
  reports: '📈 Raporty',
  phone_protection: '🔒 Ochrona telefonów',
  gallery: '🖼️ Galeria',
  no_show_stats: '🚫 Statystyki no-show',
  client_history: '📖 Historia klienta',
  time_blocks: '⛔ Blokady terminów',
  employee_sms_notify: '📱 SMS do pracownika',
};

export function getPlanById(id: string): PlanDefinition | undefined {
  const resolved = LEGACY_PLAN_IDS[id] ?? id;
  return PLANS.find(p => p.id === resolved);
}

export function hasFeature(planId: string, feature: FeatureKey): boolean {
  const plan = getPlanById(planId);
  return plan?.features.includes(feature) ?? false;
}
