import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { salonConfig } from '@/config/salon';

// Baza super-admina — wspólna dla wszystkich salonów
const MASTER_CONFIG = {
  apiKey: 'AIzaSyAYaWfzN68_XQLCgXuD7HmWh4ecpGYYukc',
  authDomain: 'salon-beauty-de32a.firebaseapp.com',
  projectId: 'salon-beauty-de32a',
  storageBucket: 'salon-beauty-de32a.firebasestorage.app',
  appId: '1:864720825148:web:c923c76903e68192198c39',
};

export type SubscriptionStatus = 'loading' | 'active' | 'inactive' | 'expired';

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>('loading');

  useEffect(() => {
    // Jeśli salon nie ma salonId — nie sprawdzamy (tryb developerski)
    if (!(salonConfig as any).salonId) {
      setStatus('active');
      return;
    }

    // Inicjalizuj osobną instancję Firebase dla master bazy
    const masterApp = getApps().find(a => a.name === 'master') 
      || initializeApp(MASTER_CONFIG, 'master');
    const masterDb = getFirestore(masterApp);

    const salonId = (salonConfig as any).salonId;
    const unsub = onSnapshot(
      doc(masterDb, 'superadmin_salons', salonId),
      (snap) => {
        if (!snap.exists()) {
          setStatus('active'); // brak wpisu = nie blokuj (nowy salon)
          return;
        }
        const data = snap.data();
        const today = new Date().toISOString().split('T')[0];
        
        if (!data.active) {
          setStatus('inactive');
        } else if (data.expiresAt && data.expiresAt < today) {
          setStatus('expired');
        } else {
          setStatus('active');
        }
      },
      () => setStatus('active') // błąd połączenia = nie blokuj
    );

    return unsub;
  }, []);

  return status;
}
