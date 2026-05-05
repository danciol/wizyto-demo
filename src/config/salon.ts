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

  colors: {
    primary: '150 40% 35%',
    primaryDark: '150 40% 25%',
    accent: '42 70% 50%',
    accentLight: '42 60% 70%',
    accentDark: '42 60% 35%',
    background: '120 15% 97%',
    secondary: '120 20% 92%',
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
