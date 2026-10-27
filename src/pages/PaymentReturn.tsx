import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { salonConfig } from '@/config/salon';

interface StatusResponse {
  depositStatus: string;
  depositAmount: number;
  date: string;
  serviceName: string;
}

// Tpay zwykle przysyła powiadomienie w kilka sekund po wpłacie, ale bywa wolniej
const POLL_MS = 3000;
const POLL_LIMIT = 40;

// Strona powrotu z bramki Tpay (/rezerwacja/platnosc?id=...).
// Adres powrotu niczego nie potwierdza — stan zaliczki czytamy z serwera.
export default function PaymentReturn() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const [data, setData] = useState<StatusResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!id) { setFailed(true); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (n: number) => {
      try {
        const res = await fetch(`/api/payments/status?id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error();
        const d = await res.json() as StatusResponse;
        if (cancelled) return;
        setData(d);
        setAttempts(n);
        if (d.depositStatus === 'awaiting_payment' && n < POLL_LIMIT) timer = setTimeout(() => poll(n + 1), POLL_MS);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    poll(1);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  const status = failed ? 'error' : data?.depositStatus ?? 'loading';
  const when = data?.date
    ? new Date(data.date).toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-lg w-full max-w-md p-8 text-center space-y-4">
        <p className="font-heading text-lg font-semibold text-primary">{salonConfig.name}</p>

        {status === 'paid' && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" />
            <h1 className="font-heading text-2xl font-bold">Zaliczka opłacona</h1>
            <p className="text-sm text-muted-foreground">
              Dziękujemy! Wpłaciłaś {data?.depositAmount} zł zaliczki za: <strong>{data?.serviceName}</strong>, {when}.
              Salon potwierdzi wizytę SMS-em lub telefonicznie.
            </p>
          </>
        )}

        {(status === 'loading' || status === 'awaiting_payment') && (
          <>
            {attempts < POLL_LIMIT ? <Loader2 className="w-14 h-14 mx-auto text-primary animate-spin" /> : <Clock className="w-14 h-14 mx-auto text-primary" />}
            <h1 className="font-heading text-2xl font-bold">Sprawdzamy płatność</h1>
            <p className="text-sm text-muted-foreground">
              {attempts < POLL_LIMIT
                ? 'Czekamy na potwierdzenie z Tpay. To zwykle trwa kilka sekund, nie zamykaj tej strony.'
                : 'Potwierdzenie jeszcze nie dotarło. Jeśli zapłaciłaś, salon zobaczy wpłatę, gdy tylko Tpay ją potwierdzi. W razie wątpliwości zadzwoń do salonu.'}
            </p>
          </>
        )}

        {status === 'expired' && (
          <>
            <XCircle className="w-14 h-14 mx-auto text-destructive" />
            <h1 className="font-heading text-2xl font-bold">Płatność nie została zakończona</h1>
            <p className="text-sm text-muted-foreground">
              Zaliczka nie wpłynęła w wyznaczonym czasie, więc termin wrócił do wolnych. Możesz zarezerwować wizytę jeszcze raz.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 mx-auto text-destructive" />
            <h1 className="font-heading text-2xl font-bold">Nie możemy sprawdzić płatności</h1>
            <p className="text-sm text-muted-foreground">
              Jeśli zapłaciłaś zaliczkę, rezerwacja jest zapisana. Zadzwoń do salonu, aby to potwierdzić{salonConfig.phone ? `: ${salonConfig.phone}` : ''}.
            </p>
          </>
        )}

        {!['paid', 'loading', 'awaiting_payment', 'expired', 'error'].includes(status) && (
          <>
            <XCircle className="w-14 h-14 mx-auto text-muted-foreground" />
            <h1 className="font-heading text-2xl font-bold">Ta rezerwacja nie czeka na zaliczkę</h1>
            <p className="text-sm text-muted-foreground">W razie pytań skontaktuj się z salonem.</p>
          </>
        )}

        <Button asChild className="w-full bg-primary text-primary-foreground font-semibold">
          <Link to="/">Wróć na stronę salonu</Link>
        </Button>
      </div>
    </div>
  );
}
