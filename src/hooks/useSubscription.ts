import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { salonConfig } from '@/config/salon';

const MASTER_CONFIG = {
  apiKey: 'AIzaSyAYaWfzN68_XQLCgXuD7HmWh4ecpGYYukc',
  authDomain: 'salon-beauty-de32a.firebaseapp.com',
  projectId: 'salon-beauty-de32a',
  storageBucket: 'salon-beauty-de32a.firebasestorage.app',
  appId: '1:864720825148:web:c923c76903e68192198c39',
};

export type SubscriptionStatus = 'loading' | 'active' | 'inactive' | 'expired';

interface SubscriptionState {
  status: SubscriptionStatus;
  planId: string;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    status: 'loading',
    planId: 'standard',
  });

  useEffect(() => {
    const salonId = (salonConfig as any).salonId;
    if (!salonId) {
      setState({ status: 'active', planId: 'pro' });
      return;
    }

    const masterApp = getApps().find(a => a.name === 'master')
      || initializeApp(MASTER_CONFIG, 'master');
    const masterDb = getFirestore(masterApp);

    const unsub = onSnapshot(
      doc(masterDb, 'superadmin_salons', salonId),
      (snap) => {
        if (!snap.exists()) {
          setState({ status: 'active', planId: 'pro' });
          return;
        }
        const data = snap.data();
        const today = new Date().toISOString().split('T')[0];
        const planId = data.plan || 'standard';

        if (!data.active) {
          setState({ status: 'inactive', planId });
        } else if (data.expiresAt && data.expiresAt < today) {
          setState({ status: 'expired', planId });
        } else {
          setState({ status: 'active', planId });
        }
      },
      () => setState({ status: 'active', planId: 'pro' })
    );

    return unsub;
  }, []);

  return state;
}
