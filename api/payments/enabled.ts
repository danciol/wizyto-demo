import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { isSandbox, tpayConfig } from '../_lib/tpay.js';

// Czy salon ma podłączone Tpay — bez tego rezerwacja idzie bez kroku płatności
export default function handler(_req: ApiRequest, res: ApiResponse) {
  const cfg = tpayConfig();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ enabled: !!cfg, sandbox: cfg ? isSandbox(cfg) : false });
}
