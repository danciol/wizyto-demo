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
  | 'services';

export interface PlanDefinition {
  id: string;
  name: string;
  price: number;
  features: FeatureKey[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'test',
    name: 'Test 3ms',
    price: 0,
    features: [
      'dashboard','calendar','appointments','employees','clients',
      'messages','online_booking','deposits','reports','phone_protection',
      'gallery','services',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 89,
    features: ['dashboard','calendar','appointments','employees','clients','services'],
  },
  {
    id: 'standard_plus',
    name: 'Standard+',
    price: 129,
    features: [
      'dashboard','calendar','appointments','employees','clients','services',
      'messages','online_booking','deposits',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    features: [
      'dashboard','calendar','appointments','employees','clients','services',
      'messages','online_booking','deposits','reports','phone_protection',
    ],
  },
];

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
};

export function getPlanById(id: string): PlanDefinition | undefined {
  return PLANS.find(p => p.id === id);
}

export function hasFeature(planId: string, feature: FeatureKey): boolean {
  const plan = getPlanById(planId);
  return plan?.features.includes(feature) ?? false;
}
