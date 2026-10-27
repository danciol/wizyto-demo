import { useState } from 'react';
import { CheckCircle2, Calendar, Clock, User, Mail, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingData } from './BookingWizard';
import { toast } from 'sonner';
import { createBookingAppointment } from '@/lib/booking';

interface Props {
  booking: BookingData;
  onClose: () => void;
  closeLabel?: string;
}

// Rezerwacja bez zaliczki. Z zaliczką rezerwację zapisuje StepPayment przed przejściem do bramki.
export function StepConfirmation({ booking, onClose, closeLabel }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await createBookingAppointment(booking, { awaitingDeposit: false });
      setSaved(true);
      toast.success('Wizyta zgłoszona — czeka na potwierdzenie salonu!');
    } catch {
      toast.error('Błąd rezerwacji. Spróbuj ponownie.');
    }
    setSaving(false);
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
        {saved ? 'Wizyta zgłoszona!' : 'Potwierdzenie rezerwacji'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {saved
          ? 'Salon potwierdzi Twoją wizytę — otrzymasz wiadomość na podany email lub telefon.'
          : 'Sprawdź dane i zatwierdź zgłoszenie'
        }
      </p>

      <div className="bg-secondary/50 rounded-xl p-5 text-left space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Termin</p>
            <p className="text-sm font-medium text-foreground">
              {booking.date?.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' o '}{booking.time}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Usługa</p>
            <p className="text-sm font-medium text-foreground">{booking.service?.name}</p>
            <p className="text-xs text-muted-foreground">{booking.service?.duration} min — {booking.service?.price} zł</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Specjalistka</p>
            <p className="text-sm font-medium text-foreground">{booking.employee?.name}</p>
          </div>
        </div>
        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <User className="w-3.5 h-3.5 text-muted-foreground" /> {booking.clientName}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {booking.clientPhone}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {booking.clientEmail}
          </div>
        </div>
      </div>

      {saved ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent-foreground text-left">
            ⏳ <strong>Co dalej?</strong> Salon skontaktuje się z Tobą, aby potwierdzić wizytę. Prosimy o cierpliwość.
          </div>
          <Button onClick={onClose} className="w-full bg-primary text-primary-foreground font-semibold">
            {closeLabel ?? 'Zamknij'}
          </Button>
        </div>
      ) : (
        <Button onClick={handleConfirm} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Wysyłam...</> : 'Wyślij zgłoszenie'}
        </Button>
      )}
    </div>
  );
}
