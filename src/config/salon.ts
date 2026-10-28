// ═══════════════════════════════════════════════════════════════
//  KONFIGURACJA SALONU
//  Zmień te wartości przy wdrożeniu dla nowego klienta
// ═══════════════════════════════════════════════════════════════

export const salonConfig = {
  salonId: 'wizyto-demo',

  name: 'Bella Beauty Studio',
  tagline: 'Profesjonalna pielęgnacja urody',
  phone: '+48 123 456 789',
  email: 'kontakt@bellabeauty.pl',
  address: 'ul. Kwiatowa 12, Kraków',
  city: 'Kraków',

  // Pudrowy róż i złoto, dobrane do wnętrza na zdjęciu salonu
  colors: {
    primary: '345 42% 46%',
    primaryDark: '345 42% 36%',
    accent: '40 62% 48%',
    accentLight: '40 60% 72%',
    accentDark: '38 55% 34%',
    background: '20 33% 97%',
    secondary: '350 35% 93%',
    foreground: '345 22% 14%',
    muted: '350 25% 95%',
    mutedForeground: '345 10% 42%',
    border: '350 22% 87%',
  },

  social: {
    instagram: 'https://instagram.com/bellabeauty',
    facebook: 'https://facebook.com/bellabeauty',
  },

  firebase: {
    apiKey: 'AIzaSyBfF6QU14ocgzEsDX6cZkWsilHHc6kiILk',
    authDomain: 'wizyto-demo.firebaseapp.com',
    projectId: 'wizyto-demo',
    storageBucket: 'wizyto-demo.firebasestorage.app',
    appId: '1:662975000360:web:45caa10ef9b13be0c9ea1d',
  },

  cloudinary: {
    cloudName: 'dazjs69yk',
    uploadPreset: 'majli_gallery',
  },

  subscription: {
    active: true,
    plan: 'test',
    expiresAt: '2027-12-31',
  },
};

export type SalonConfig = typeof salonConfig;
