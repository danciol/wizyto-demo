import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookingData } from './BookingWizard';

interface Props {
  booking: BookingData;
  onSubmit: (data: Partial<BookingData>) => void;
  onBack: () => void;
}

export function StepClientForm({ booking, onSubmit, onBack }: Props) {
  const [name, setName] = useState(booking.clientName);
  const [phone, setPhone] = useState(booking.clientPhone);
  const [email, setEmail] = useState(booking.clientEmail);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Imię i nazwisko jest wymagane';
    if (!phone.trim()) errs.phone = 'Numer telefonu jest wymagany';
    else if (!/^[\d\s+\-()]{7,15}$/.test(phone.trim())) errs.phone = 'Nieprawidłowy numer telefonu';
    if (!email.trim()) errs.email = 'Email jest wymagany';
    // Końcówka domeny z samych liter (np. .pl, .com) — operator płatności odrzuca adresy typu "a@b.2d"
    else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) errs.email = 'Nieprawidłowy adres email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ clientName: name.trim(), clientPhone: phone.trim(), clientEmail: email.trim() });
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft size={16} /> Zmień termin
      </button>
      <p className="text-muted-foreground text-sm mb-4">Podaj swoje dane kontaktowe</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="b-name">Imię i nazwisko</Label>
          <Input id="b-name" value={name} onChange={e => setName(e.target.value)} placeholder="Anna Nowak" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="b-phone">Numer telefonu</Label>
          <Input id="b-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 600 100 200" />
          {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
        </div>
        <div>
          <Label htmlFor="b-email">Adres email</Label>
          <Input id="b-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="anna@email.com" />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>

        {/* Summary */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-1.5 text-sm">
          <p className="font-medium text-foreground">Podsumowanie</p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">{booking.service?.name}</span> — {booking.service?.price} zł
          </p>
          <p className="text-muted-foreground">
            Specjalistka: <span className="text-foreground">{booking.employee?.name}</span>
          </p>
          <p className="text-muted-foreground">
            Termin: <span className="text-foreground">{booking.time}</span>
            {booking.date && `, ${booking.date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          </p>
        </div>

        <Button type="submit" className="w-full bg-primary text-primary-foreground font-semibold">
          Potwierdź rezerwację
        </Button>
      </form>
    </div>
  );
}
