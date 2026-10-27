// Wspólne zasady zaliczek — używane w przeglądarce i w funkcjach serwerowych (api/).
// Plik nie może importować niczego z aplikacji, bo serwer ładuje go bezpośrednio.

/** Ile minut termin jest zablokowany na opłacenie zaliczki (po tym czasie termin wraca do wolnych). */
export const DEPOSIT_HOLD_MIN = 30;

/** Kwota zaliczki: ustawiona przy usłudze ma pierwszeństwo przed domyślną z Ustawień. */
export function resolveDepositAmount(serviceDeposit: number | undefined | null, globalDeposit: number | undefined | null): number {
  if (serviceDeposit && serviceDeposit > 0) return serviceDeposit;
  if (globalDeposit && globalDeposit > 0) return globalDeposit;
  return 0;
}

interface HoldLike {
  status: string;
  depositStatus?: string;
  createdAt: string;
}

/** Rezerwacja czeka na decyzję salonu — bez tych, za które klientka jeszcze nie zapłaciła zaliczki. */
export function awaitsSalonConfirmation(a: HoldLike): boolean {
  return a.status === 'pending' && a.depositStatus !== 'awaiting_payment' && a.depositStatus !== 'expired';
}

/** Rezerwacja czekała na zaliczkę dłużej, niż trwa blokada — termin jest znowu wolny. */
export function isExpiredDepositHold(a: HoldLike, now = Date.now()): boolean {
  if (a.depositStatus === 'expired') return true;
  if (a.depositStatus !== 'awaiting_payment' || a.status !== 'pending') return false;
  // 5 min zapasu na spóźnione powiadomienie z Tpay
  return now - new Date(a.createdAt).getTime() > (DEPOSIT_HOLD_MIN + 5) * 60000;
}
