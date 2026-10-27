import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { siteUrl } from '../_lib/http.js';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { createTransaction, tpayConfig } from '../_lib/tpay.js';
import { isExpiredDepositHold, resolveDepositAmount } from '../../src/lib/deposit.js';

// POST { appointmentId } → { url } adres bramki Tpay.
// Rezerwację zapisuje wcześniej przeglądarka ze statusem zaliczki 'awaiting_payment'.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const cfg = tpayConfig();
  if (!cfg) return res.status(503).json({ error: 'Płatności online nie są skonfigurowane' });

  const { appointmentId } = (req.body ?? {}) as { appointmentId?: string };
  if (!appointmentId || typeof appointmentId !== 'string') return res.status(400).json({ error: 'Brak appointmentId' });

  try {
    const db = adminDb();
    const ref = db.collection('appointments').doc(appointmentId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Nie znaleziono rezerwacji' });
    const appt = snap.data()!;

    if (appt.depositStatus !== 'awaiting_payment' || appt.status !== 'pending' || isExpiredDepositHold(appt as never)) {
      return res.status(409).json({ error: 'Ta rezerwacja nie czeka już na zaliczkę' });
    }
    if (!appt.clientEmail) return res.status(400).json({ error: 'Do płatności potrzebny jest adres e-mail' });

    // Kwotę liczymy na serwerze — nie ufamy temu, co zapisała przeglądarka
    const [serviceSnap, settingsSnap] = await Promise.all([
      db.collection('services').doc(appt.serviceId).get(),
      db.collection('settings').doc('global').get(),
    ]);
    const service = serviceSnap.data();
    const amount = resolveDepositAmount(service?.depositAmount, settingsSnap.data()?.depositAmount);
    if (amount <= 0) return res.status(409).json({ error: 'Ta usługa nie wymaga zaliczki' });

    const paymentSessionId = `${appointmentId}-${Date.now()}`;
    await ref.update({ paymentSessionId, depositAmount: amount, updatedAt: new Date().toISOString() });

    const base = siteUrl(req);
    const returnUrl = `${base}/rezerwacja/platnosc?id=${encodeURIComponent(appointmentId)}`;
    // Podgląd na Vercelu jest chroniony logowaniem — Tpay przepuszcza tylko klucz "Protection Bypass for Automation"
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const notificationUrl = `${base}/api/payments/notify${bypass ? `?x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : ''}`;
    const { url, transactionId } = await createTransaction(cfg, {
      amount,
      description: `Zaliczka: ${service?.name ?? 'wizyta'}`,
      hiddenDescription: paymentSessionId,
      email: appt.clientEmail,
      name: appt.clientName,
      phone: appt.clientPhone,
      successUrl: returnUrl,
      errorUrl: returnUrl,
      notificationUrl,
    });
    if (transactionId) await ref.update({ paymentTransactionId: transactionId });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('payments/register', err);
    return res.status(502).json({ error: 'Nie udało się rozpocząć płatności. Spróbuj ponownie.' });
  }
}
