import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { salonConfig } from '@/config/salon';

const app = initializeApp(salonConfig.firebase);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
