import { createHash, createVerify, X509Certificate } from 'node:crypto';

// Konto Tpay salonu — zmienne środowiskowe projektu na Vercelu:
//   TPAY_CLIENT_ID, TPAY_CLIENT_SECRET  (Panel Tpay → Integracja → API → Klucze Open API)
//   TPAY_SECURITY_CODE                  (Panel Tpay → Powiadomienia → Bezpieczeństwo; puste, jeśli nieustawiony)
//   TPAY_SANDBOX=true                   na koncie testowym (panel.sandbox.tpay.com)
export interface TpayConfig {
  clientId: string;
  clientSecret: string;
  securityCode: string;
  apiUrl: string;
  secureUrl: string; // skąd pochodzą certyfikaty podpisu powiadomień
}

export function tpayConfig(): TpayConfig | null {
  const { TPAY_CLIENT_ID, TPAY_CLIENT_SECRET, TPAY_SECURITY_CODE, TPAY_SANDBOX } = process.env;
  if (!TPAY_CLIENT_ID || !TPAY_CLIENT_SECRET || !process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  const sandbox = TPAY_SANDBOX === 'true';
  return {
    clientId: TPAY_CLIENT_ID,
    clientSecret: TPAY_CLIENT_SECRET,
    securityCode: TPAY_SECURITY_CODE ?? '',
    apiUrl: sandbox ? 'https://openapi.sandbox.tpay.com' : 'https://api.tpay.com',
    secureUrl: sandbox ? 'https://secure.sandbox.tpay.com' : 'https://secure.tpay.com',
  };
}

export function isSandbox(cfg: TpayConfig): boolean {
  return cfg.apiUrl.includes('sandbox');
}

// Token OAuth jest ważny ok. 2 h — trzymamy go, dopóki funkcja żyje
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(cfg: TpayConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`${cfg.apiUrl}/oauth/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret }),
  });
  const data = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) throw new Error(`Tpay oauth ${res.status}`);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000 };
  return data.access_token;
}

export interface CreateTransactionInput {
  amount: number; // zł
  description: string;
  hiddenDescription: string; // wraca w powiadomieniu jako tr_crc — po nim znajdujemy rezerwację
  email: string;
  name: string;
  phone?: string;
  successUrl: string;
  errorUrl: string;
  notificationUrl: string;
}

/** Zakłada transakcję i zwraca adres bramki, na który przekierowujemy klientkę. */
export async function createTransaction(cfg: TpayConfig, input: CreateTransactionInput): Promise<{ url: string; transactionId: string }> {
  const res = await fetch(`${cfg.apiUrl}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken(cfg)}` },
    body: JSON.stringify({
      amount: input.amount,
      description: input.description,
      hiddenDescription: input.hiddenDescription,
      lang: 'pl',
      payer: { email: input.email, name: input.name, ...(input.phone && { phone: input.phone }) },
      callbacks: {
        payerUrls: { success: input.successUrl, error: input.errorUrl },
        notification: { url: input.notificationUrl },
      },
    }),
  });
  const data = await res.json().catch(() => ({})) as { result?: string; transactionId?: string; transactionPaymentUrl?: string };
  if (!res.ok || data.result !== 'success' || !data.transactionPaymentUrl) {
    throw new Error(`Tpay transactions ${res.status}: ${JSON.stringify(data)}`);
  }
  return { url: data.transactionPaymentUrl, transactionId: data.transactionId ?? '' };
}

const base64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cachedRoot: X509Certificate | null = null;

async function fetchCert(url: string): Promise<X509Certificate> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Certyfikat ${url}: ${res.status}`);
  return new X509Certificate(await res.text());
}

/**
 * Sprawdza podpis JWS powiadomienia (nagłówek X-JWS-Signature, payload odłączony = surowe body).
 * Certyfikat musi pochodzić z serwera Tpay i być podpisany certyfikatem głównym Tpay.
 */
export async function isValidJws(cfg: TpayConfig, jws: string | undefined, rawBody: Buffer): Promise<boolean> {
  if (!jws) return false;
  const [headerB64, , signatureB64] = jws.split('.');
  if (!headerB64 || !signatureB64) return false;

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as { x5u?: string };
  if (!header.x5u || !header.x5u.startsWith(`${cfg.secureUrl}/`)) return false;

  const [cert, root] = await Promise.all([
    fetchCert(header.x5u),
    cachedRoot ? Promise.resolve(cachedRoot) : fetchCert(`${cfg.secureUrl}/x509/tpay-jws-root.pem`),
  ]);
  cachedRoot = root;
  if (!cert.checkIssued(root) || !cert.verify(root.publicKey)) return false;

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${base64url(rawBody)}`);
  return verifier.verify(cert.publicKey, Buffer.from(signatureB64, 'base64url'));
}

/** Suma kontrolna powiadomienia: md5(id + tr_id + tr_amount + tr_crc + kod bezpieczeństwa). */
export function isValidMd5(cfg: TpayConfig, n: URLSearchParams): boolean {
  const expected = createHash('md5')
    .update(`${n.get('id') ?? ''}${n.get('tr_id') ?? ''}${n.get('tr_amount') ?? ''}${n.get('tr_crc') ?? ''}${cfg.securityCode}`)
    .digest('hex');
  return expected === n.get('md5sum');
}
