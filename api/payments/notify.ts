import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { adminDb } from '../_lib/firebaseAdmin.js';
import { isValidJws, isValidMd5, tpayConfig } from '../_lib/tpay.js';
import { getPlanById } from '../../src/config/plans.js';

// Powiadomienie od Tpay o wpłacie (form-urlencoded, podpis JWS w X-JWS-Signature).
// Tpay ponawia je, dopóki nie dostanie 200 i "TRUE"; po 404 przestaje.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const cfg = tpayConfig();
  if (!cfg) return res.status(503).send('Not configured');

  // Podpis JWS liczony jest z surowego body, więc nie korzystamy z req.body
  const rawBody = await readRawBody(req);
  const n = new URLSearchParams(rawBody.toString('utf8'));
  const jws = req.headers['x-jws-signature'] as string | undefined;

  try {
    // JWS jest obowiązkowy; md5sum sprawdzamy dodatkowo, gdy salon podał kod bezpieczeństwa
    const jwsOk = await isValidJws(cfg, jws, rawBody);
    const md5Ok = cfg.securityCode ? isValidMd5(cfg, n) : true;
    if (!jwsOk || !md5Ok) {
      console.warn('payments/notify: odrzucone powiadomienie', JSON.stringify({
        trId: n.get('tr_id'), jwsOk, md5Ok, hasJws: !!jws, bodyLength: rawBody.length,
        x5u: jws ? safeX5u(jws) : null,
      }));
      return res.status(400).send('FALSE - Invalid signature');
    }

    const sessionId = n.get('tr_crc') ?? '';
    const db = adminDb();
    const found = await db.collection('appointments').where('paymentSessionId', '==', sessionId).limit(1).get();
    if (found.empty) {
      console.error('payments/notify: brak rezerwacji dla sesji', sessionId);
      return res.status(404).send('FALSE - Unknown session');
    }
    const ref = found.docs[0].ref;
    const appt = found.docs[0].data();
    const status = (n.get('tr_status') ?? '').toLowerCase();
    const now = new Date().toISOString();

    if (status === 'chargeback') {
      await ref.update({ depositStatus: 'refunded', updatedAt: now });
      return res.status(200).send('TRUE');
    }
    if (status !== 'true') return res.status(200).send('TRUE'); // inne statusy nas nie dotyczą
    if (appt.depositStatus === 'paid') return res.status(200).send('TRUE'); // powtórzone powiadomienie

    const paidGrosze = Math.round(parseFloat(n.get('tr_paid') ?? '0') * 100);
    if (paidGrosze < Math.round((appt.depositAmount ?? 0) * 100)) {
      console.error('payments/notify: wpłata niższa niż zaliczka', sessionId, n.get('tr_paid'), appt.depositAmount);
      await ref.update({ depositStatus: 'underpaid', depositOrderId: n.get('tr_id'), updatedAt: now });
      return res.status(200).send('TRUE');
    }

    // Wpłata po wygaśnięciu blokady: termin mógł zostać zajęty — salon musi to sprawdzić
    const late = appt.depositStatus !== 'awaiting_payment' || appt.status === 'cancelled';
    await ref.update({
      depositStatus: 'paid',
      depositOrderId: n.get('tr_id'),
      depositPaidAt: now,
      ...(late && { depositLate: true }),
      updatedAt: now,
    });

    if (!late) await notifyEmployee(db, appt).catch(err => console.warn('payments/notify: SMS do pracownika', err));
    return res.status(200).send('TRUE');
  } catch (err) {
    console.error('payments/notify', err);
    return res.status(500).send('FALSE'); // Tpay spróbuje ponownie
  }
}

function safeX5u(jws: string): string | null {
  try {
    return (JSON.parse(Buffer.from(jws.split('.')[0], 'base64url').toString('utf8')) as { x5u?: string }).x5u ?? null;
  } catch { return null; }
}

function readRawBody(req: ApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Ta sama wiadomość, którą dostaje pracownik przy rezerwacji bez zaliczki (plan z employee_sms_notify)
async function notifyEmployee(db: ReturnType<typeof adminDb>, appt: FirebaseFirestore.DocumentData) {
  const [settingsSnap, empSnap, serviceSnap] = await Promise.all([
    db.collection('settings').doc('global').get(),
    db.collection('employees').doc(appt.employeeId).get(),
    db.collection('services').doc(appt.serviceId).get(),
  ]);
  const settings = settingsSnap.data() ?? {};
  const phone = empSnap.data()?.phone;
  const plan = getPlanById(settings.plan || 'trial');
  if (!phone || !settings.textBeeApiKey || !settings.textBeeDeviceId || !plan?.features.includes('employee_sms_notify')) return;

  const when = new Date(appt.date).toLocaleString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw',
  });
  await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${settings.textBeeDeviceId}/send-sms`, {
    method: 'POST',
    headers: { 'x-api-key': settings.textBeeApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receivers: [phone],
      message: `Nowa wizyta (zaliczka opłacona): ${appt.clientName}, ${serviceSnap.data()?.name ?? 'wizyta'}, ${when}`,
    }),
  });
}
