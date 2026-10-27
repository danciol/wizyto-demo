import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Klucz konta serwisowego Firebase salonu (cały JSON) w zmiennej FIREBASE_SERVICE_ACCOUNT.
// Firebase Console → Ustawienia projektu → Konta usługi → Wygeneruj nowy klucz prywatny.
export function adminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Brak FIREBASE_SERVICE_ACCOUNT');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}
