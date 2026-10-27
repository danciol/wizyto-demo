import { useEffect, useState } from 'react';

interface PaymentsState {
  enabled: boolean;
  sandbox: boolean;
  loading: boolean;
}

/** Czy salon ma podłączone Tpay (klucze są tylko na serwerze, więc pytamy /api). */
export function usePayments(): PaymentsState {
  const [state, setState] = useState<PaymentsState>({ enabled: false, sandbox: false, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/payments/enabled')
      .then(r => (r.ok ? r.json() : { enabled: false, sandbox: false }))
      .catch(() => ({ enabled: false, sandbox: false })) // np. lokalny `vite dev` bez funkcji serwerowych
      .then(d => { if (!cancelled) setState({ enabled: !!d.enabled, sandbox: !!d.sandbox, loading: false }); });
    return () => { cancelled = true; };
  }, []);

  return state;
}
