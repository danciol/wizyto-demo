import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { isExpiredDepositHold } from '../../src/lib/deposit.js';

// Codzienny cron (vercel.json): anuluje rezerwacje, za które nikt nie zapłacił zaliczki.
// Terminy zwalniają się już po upływie blokady — to tylko porządkuje listę wizyt w panelu.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = adminDb();
    const snap = await db.collection('appointments').where('depositStatus', '==', 'awaiting_payment').get();
    const expired = snap.docs.filter(d => isExpiredDepositHold(d.data() as never));
    const now = new Date().toISOString();
    await Promise.all(expired.map(d => d.ref.update({ status: 'cancelled', depositStatus: 'expired', updatedAt: now })));
    return res.status(200).json({ cancelled: expired.length });
  } catch (err) {
    console.error('payments/cleanup', err);
    return res.status(500).json({ error: 'Błąd serwera' });
  }
}
