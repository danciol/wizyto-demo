import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { queryParam } from '../_lib/http.js';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { isExpiredDepositHold } from '../../src/lib/deposit.js';

// GET ?id=<appointmentId> → stan zaliczki dla strony powrotu z bramki (bez danych klientki)
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const id = queryParam(req, 'id');
  if (!id) return res.status(400).json({ error: 'Brak id' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const db = adminDb();
    const snap = await db.collection('appointments').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Nie znaleziono rezerwacji' });
    const a = snap.data()!;
    const service = (await db.collection('services').doc(a.serviceId).get()).data();
    const expired = a.depositStatus === 'awaiting_payment' && isExpiredDepositHold(a as never);
    return res.status(200).json({
      depositStatus: expired ? 'expired' : a.depositStatus,
      depositAmount: a.depositAmount ?? 0,
      date: a.date,
      serviceName: service?.name ?? '',
    });
  } catch (err) {
    console.error('payments/status', err);
    return res.status(500).json({ error: 'Błąd serwera' });
  }
}
