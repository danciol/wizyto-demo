import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPlanById } from '@/config/plans';
import { sendSms } from '@/lib/textbee';
import type { Appointment } from '@/data/services';
import type { BookingData } from '@/components/booking/BookingWizard';

/**
 * Zapisuje rezerwację z kreatora (klientkę dopisuje do bazy po numerze telefonu).
 * Przy zaliczce rezerwacja startuje jako 'awaiting_payment' i blokuje termin na czas płatności.
 */
export async function createBookingAppointment(booking: BookingData, opts: { awaitingDeposit: boolean }): Promise<string> {
  if (!booking.service || !booking.employee || !booking.date || !booking.time) throw new Error('Niepełna rezerwacja');

  const [hours, minutes] = booking.time.split(':').map(Number);
  const dateObj = new Date(booking.date);
  dateObj.setHours(hours, minutes, 0, 0);

  const clientsSnap = await getDocs(query(collection(db, 'clients'), where('phone', '==', booking.clientPhone)));
  const clientId = !clientsSnap.empty
    ? clientsSnap.docs[0].id
    : (await addDoc(collection(db, 'clients'), {
        name: booking.clientName,
        phone: booking.clientPhone,
        email: booking.clientEmail,
        appointmentIds: [],
      })).id;

  const now = new Date().toISOString();
  const appointment: Omit<Appointment, 'id'> = {
    serviceId: booking.service.id,
    employeeId: booking.employee.id,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientEmail: booking.clientEmail,
    clientId,
    date: dateObj.toISOString(),
    duration: booking.service.duration,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    // Kwotę zaliczki ustala i zapisuje serwer przy rejestracji płatności
    depositStatus: opts.awaitingDeposit ? 'awaiting_payment' : 'none',
  };
  const ref = await addDoc(collection(db, 'appointments'), appointment);

  // Przy zaliczce SMS do pracownika wysyła serwer dopiero po opłaceniu
  if (!opts.awaitingDeposit) await notifyEmployee(booking).catch(() => { /* SMS nie blokuje rezerwacji */ });
  return ref.id;
}

async function notifyEmployee(booking: BookingData) {
  const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
  const plan = getPlanById(settingsSnap.data()?.plan || 'trial');
  if (!plan?.features.includes('employee_sms_notify') || !booking.employee?.phone) return;
  const dateStr = booking.date?.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) || '';
  await sendSms([booking.employee.phone], `Nowa wizyta: ${booking.clientName}, ${booking.service?.name}, ${dateStr} o ${booking.time}`);
}
