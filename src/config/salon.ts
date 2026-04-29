// ═══════════════════════════════════════════════════════════════
//  KONFIGURACJA SALONU
//  Zmień te wartości przy wdrożeniu dla nowego klienta
// ═══════════════════════════════════════════════════════════════

export const salonConfig = {
  // ID używane do sprawdzania subskrypcji — musi zgadzać się z ID w panelu super-admina
  salonId: 'majli-beauty-1777446801447',

  // ── Podstawowe info ──────────────────────────────────────────
  name: 'Majli Beauty',
  tagline: 'Profesjonalna pielęgnacja urody',
  phone: '+48 123 456 789',
  email: 'kontakt@majlibeauty.pl',
  address: 'ul. Przykładowa 1, Warszawa',
  city: 'Warszawa',

  // ── Kolorystyka (HSL bez nawiasów) ───────────────────────────
  colors: {
    primary: '150 40% 35%',        // zielony
    primaryDark: '150 40% 25%',
    accent: '42 70% 50%',          // złoty
    accentLight: '42 60% 70%',
    accentDark: '42 60% 35%',
    background: '120 15% 97%',
    secondary: '120 20% 92%',
  },

  // ── Media społecznościowe ─────────────────────────────────────
  social: {
    instagram: 'https://instagram.com/majlibeauty',
    facebook: 'https://facebook.com/majlibeauty',
  },

  // ── Firebase ─────────────────────────────────────────────────
  firebase: {
    apiKey: 'AIzaSyAYaWfzN68_XQLCgXuD7HmWh4ecpGYYukc',
    authDomain: 'salon-beauty-de32a.firebaseapp.com',
    projectId: 'salon-beauty-de32a',
    storageBucket: 'salon-beauty-de32a.firebasestorage.app',
    appId: '1:864720825148:web:c923c76903e68192198c39',
  },

  // ── Cloudinary ───────────────────────────────────────────────
  cloudinary: {
    cloudName: 'dazjs69yk',
    uploadPreset: 'majli_gallery',
  },

  // ── Subskrypcja (do weryfikacji przez super-admina) ──────────
  subscription: {
    active: true,
    plan: 'standard',           // 'trial' | 'standard' | 'pro'
    expiresAt: '2026-12-31',
  },
};

export type SalonConfig = typeof salonConfig;
