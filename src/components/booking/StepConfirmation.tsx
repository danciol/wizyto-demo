import { useState } from 'react';
import { CheckCircle2, Calendar, Clock, User, Mail, Phone, Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingData } from './BookingWizard';
import { useAppointments, useClients } from '@/hooks/useFirestore';
import { toast } from 'sonner';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPlanById } from '@/config/plans';
import { sendSms } from '@/lib/textbee';

interface Props {
  booking: BookingData;
  onClose: () => void;
}

export function StepConfirmation({ booking, onClose }: Props) {
  const { addAppointment } = useAppointments();
  const { addClient } = useClients();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const depositAmount = booking.service?.depositAmount ?? 0;
  const depositPaid = !!booking.depositOrderId;

  const handleConfirm = async () => {
    if (!booking.service || !booking.employee || !booking.date || !booking.time) return;
    setSaving(true);
    try {
      const [hours, minutes] = booking.time.split(':').map(Number);
      const dateObj = new Date(booking.date);
      dateObj.setHours(hours, minutes, 0, 0);

      await addAppointment({
        serviceId: booking.service.id,
        employeeId: booking.employee.id,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        clientEmail: booking.clientEmail,
        date: dateObj.toISOString(),
        duration: booking.service.duration,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...(depositAmount > 0 && { depositAmount }),
        ...(depositPaid && { depositStatus: 'paid' }),
        ...(booking.depositOrderId && { depositOrderId: booking.depositOrderId }),
      });

      const clientsSnap = await getDocs(
        query(collection(db, 'clients'), where('phone', '==', booking.clientPhone))
      );
      if (clientsSnap.empty) {
        await addClient({
          name: booking.clientName,
          phone: booking.clientPhone,
          email: booking.clientEmail,
          appointmentIds: [],
        });
      }

      setSaved(true);
      toast.success('Wizyta zgłoszona — czeka na potwierdzenie salonu!');

      // Employee SMS notification (Pro feature)
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        const planId = settingsSnap.data()?.plan || 'test';
        const plan = getPlanById(planId);
        if (plan?.features.includes('employee_sms_notify') && booking.employee?.phone) {
          const dateStr = booking.date?.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) || '';
          await sendSms(
            [booking.employee.phone],
            `Nowa wizyta: ${booking.clientName}, ${booking.service?.name}, ${dateStr} o ${booking.time}`
          );
        }
      } catch { /* silent */ }
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
        {depositPaid && (
          <div className="flex items-start gap-3">
            <CreditCard className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Zaliczka</p>
              <p className="text-sm font-medium text-green-600">Zapłacono {depositAmount} zł ✓</p>
            </div>
          </div>
        )}
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
            Zamknij
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
