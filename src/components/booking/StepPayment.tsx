import { useState } from 'react';
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingData } from './BookingWizard';
import { createBookingAppointment } from '@/lib/booking';
import { DEPOSIT_HOLD_MIN } from '@/lib/deposit';

interface Props {
  booking: BookingData;
  depositAmount: number;
  sandbox: boolean;
  onBack: () => void;
}

// Zapisuje rezerwację (blokuje termin na DEPOSIT_HOLD_MIN minut) i przekierowuje do bramki Tpay.
// O opłaceniu decyduje serwer po powiadomieniu z Tpay — klientka wraca na /rezerwacja/platnosc.
export function StepPayment({ booking, depositAmount, sandbox, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Przy ponownej próbie używamy tej samej rezerwacji, żeby nie blokować dwóch terminów
      const id = appointmentId ?? await createBookingAppointment(booking, { awaitingDeposit: true });
      setAppointmentId(id);

      const res = await fetch('/api/payments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id }),
      });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Nie udało się rozpocząć płatności');

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd płatności');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">Zaliczka</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Wymagana zaliczka, aby potwierdzić rezerwację
        </p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Usługa</span>
          <span className="font-medium">{booking.service?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cena całkowita</span>
          <span>{booking.service?.price} zł</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-semibold">Zaliczka teraz</span>
          <span className="font-bold text-primary text-lg">{depositAmount} zł</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pozostałe {Math.max(0, (booking.service?.price ?? 0) - depositAmount)} zł płatne w salonie
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Termin rezerwujemy dla Ciebie na {DEPOSIT_HOLD_MIN} minut. Jeśli w tym czasie zaliczka nie wpłynie, termin wróci do wolnych.
      </p>

      {sandbox && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <AlertCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-accent-foreground">
            <strong>Tryb testowy Tpay</strong> — prawdziwe pieniądze nie zostaną pobrane.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
        <ShieldCheck className="w-3.5 h-3.5" />
        Bezpieczna płatność przez Tpay
      </div>

      <div className="space-y-2">
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-semibold"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Przechodzę do płatności...</>
            : `Zapłać ${depositAmount} zł zaliczki`
          }
        </Button>
        {/* Po zapisaniu rezerwacji cofnięcie zmieniłoby dane już zablokowanego terminu */}
        {!appointmentId && (
          <Button variant="ghost" onClick={onBack} disabled={loading} className="w-full">
            Wróć
          </Button>
        )}
      </div>
    </div>
  );
}
