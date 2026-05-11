import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function getConfig(): Promise<{ apiKey: string; deviceId: string } | null> {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  if (!snap.exists()) return null;
  const { textBeeApiKey, textBeeDeviceId } = snap.data();
  if (!textBeeApiKey || !textBeeDeviceId) return null;
  return { apiKey: textBeeApiKey, deviceId: textBeeDeviceId };
}

export async function sendSms(phones: string[], message: string): Promise<{ sent: number; failed: number }> {
  const config = await getConfig();
  if (!config) throw new Error('Brak konfiguracji TextBee w Ustawieniach');

  let sent = 0;
  let failed = 0;
  for (const phone of phones) {
    try {
      const res = await fetch(
        `https://api.textbee.dev/api/v1/gateway/devices/${config.deviceId}/send-sms`,
        {
          method: 'POST',
          headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ receivers: [phone], message }),
        }
      );
      if (res.ok) sent++;
      else failed++;
    } catch { failed++; }
  }
  return { sent, failed };
}

export async function isTextBeeConfigured(): Promise<boolean> {
  const config = await getConfig();
  return !!config;
}
