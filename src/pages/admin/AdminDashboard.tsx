import { useMemo, useState } from 'react';
import { Calendar, Users, Clock, TrendingUp, Loader2, Database, AlertCircle, CheckCircle, X, MessageSquare } from 'lucide-react';
import { useAppointments, useServices, useEmployees } from '@/hooks/useFirestore';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { seedFirestore } from '@/lib/seedFirestore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { Appointment } from '@/data/services';
import { usePlan } from '@/hooks/usePlan';
import { createCalendarEvent, deleteCalendarEvent, buildCalendarEvent } from '@/lib/googleCalendar';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const statusLabels: Record<string, string> = {
  pending: 'Oczekuje',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  completed: 'Zakończona',
};

const statusColors: Record<string, string> = {
  pending: 'bg-accent/20 text-accent-foreground',
  confirmed: 'bg-primary/15 text-primary',
  cancelled: 'bg-destructive/15 text-destructive',
  completed: 'bg-green-100 text-green-700',
};

const depositLabels: Record<string, string> = {
  none: '',
  pending: '💳 Zaliczka oczekuje',
  paid: '✅ Zaliczka zapłacona',
  refunded: '↩️ Zwrócona',
};

const AdminDashboard = () => {
  const { appointments, loading: loadingA, updateAppointment } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const [seeding, setSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loading = loadingA || loadingS || loadingE;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrow = addDays(today, 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const todayAppointments = useMemo(
    () => [...appointments]
      .filter(a => a.date.startsWith(todayStr))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments, todayStr]
  );

  const tomorrowAppointments = useMemo(
    () => [...appointments]
      .filter(a => a.date.startsWith(tomorrowStr) && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments, tomorrowStr]
  );

  const pendingAppointments = useMemo(
    () => [...appointments]
      .filter(a => a.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments]
  );

  const stats = [
    { label: 'Wizyty dziś', value: todayAppointments.length, icon: Calendar, color: 'text-primary' },
    { label: 'Jutro', value: tomorrowAppointments.length, icon: Clock, color: 'text-blue-500' },
    { label: 'Do potwierdzenia', value: pendingAppointments.length, icon: AlertCircle, color: 'text-destructive' },
    { label: 'Wszystkie wizyty', value: appointments.length, icon: TrendingUp, color: 'text-green-600' },
  ];

  const sendSmsReminder = (appt: Appointment) => {
    if (!appt.clientPhone) { toast.error('Brak numeru telefonu'); return; }
    const service = services.find(s => s.id === appt.serviceId);
    const date = format(new Date(appt.date), "d MMMM 'o godz.' HH:mm", { locale: pl });
    const text = `Przypomnienie: wizyta w salonie Majli Beauty ${date} (${service?.name || 'wizyta'}). Do zobaczenia! 💅`;
    window.open(`sms:${appt.clientPhone}?body=${encodeURIComponent(text)}`, '_blank');
  };

  const { can } = usePlan();
  const hasGoogleCal = can('online_booking');

  const handleStatus = async (id: string, status: Appointment['status']) => {
    setUpdatingId(id);
    try {
      await updateAppointment(id, { status });
      toast.success(`Wizyta ${status === 'confirmed' ? 'potwierdzona' : 'anulowana'}`);
      if (hasGoogleCal) {
        const appt = appointments.find(a => a.id === id);
        if (appt) {
          const service = services.find(s => s.id === appt.serviceId);
          const employee = employees.find(e => e.id === appt.employeeId);
          const calId = (employee as any)?.googleCalendarId;
          if (employee && calId) {
            const event = buildCalendarEvent({ date: appt.date, duration: appt.duration, clientName: appt.clientName, serviceName: service?.name });
            if (status === 'confirmed' && !appt.googleCalendarEventId) {
              const eid = await createCalendarEvent(calId, event);
              if (eid) await updateDoc(doc(db, 'appointments', id), { googleCalendarEventId: eid });
            } else if (status === 'cancelled' && appt.googleCalendarEventId) {
              await deleteCalendarEvent(calId, appt.googleCalendarEventId);
              await updateDoc(doc(db, 'appointments', id), { googleCalendarEventId: null });
            }
          }
        }
      }
    } catch { toast.error('Błąd zmiany statusu'); } finally { setUpdatingId(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(today, "EEEE, d MMMM yyyy", { locale: pl })}
          </p>
        </div>
        {services.length === 0 && employees.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true);
              try {
                const seeded = await seedFirestore();
                if (seeded) toast.success('Dane początkowe dodane do Firestore!');
                else toast.info('Baza już zawiera dane');
              } catch { toast.error('Błąd seedowania'); }
              setSeeding(false);
            }}
          >
            <Database className="w-4 h-4 mr-2" />
            {seeding ? 'Dodawanie...' : 'Załaduj dane początkowe'}
          </Button>
        )}
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sekcja: Do potwierdzenia */}
      {pendingAppointments.length > 0 && (
        <div className="glass-card p-6 border border-destructive/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Do potwierdzenia
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingAppointments.length}
              </span>
            </h2>
            <Link to="/admin/wizyty" className="text-xs text-primary hover:underline">
              Zobacz wszystkie →
            </Link>
          </div>
          <div className="space-y-3">
            {pendingAppointments.slice(0, 5).map((appt) => {
              const service = services.find(s => s.id === appt.serviceId);
              const employee = employees.find(e => e.id === appt.employeeId);
              const isUpdating = updatingId === appt.id;
              return (
                <div key={appt.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center min-w-[50px] shrink-0">
                      <p className="text-xs text-muted-foreground">{format(new Date(appt.date), 'd MMM', { locale: pl })}</p>
                      <p className="text-sm font-bold">{format(new Date(appt.date), 'HH:mm')}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{appt.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {service?.name} · {employee?.name}
                      </p>
                      {appt.depositStatus === 'paid' && (
                        <p className="text-xs text-green-600 font-medium">✅ Zaliczka {appt.depositAmount} zł</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          title="Potwierdź"
                          onClick={() => handleStatus(appt.id, 'confirmed')}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Anuluj"
                          onClick={() => handleStatus(appt.id, 'cancelled')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {pendingAppointments.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                i jeszcze {pendingAppointments.length - 5} więcej...{' '}
                <Link to="/admin/wizyty" className="text-primary hover:underline">Zobacz wszystkie</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Jutrzejsze wizyty */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Jutrzejsze wizyty
            <span className="text-sm font-normal text-muted-foreground">
              ({format(tomorrow, 'd MMMM', { locale: pl })})
            </span>
          </h2>
          {tomorrowAppointments.length > 0 && (
            <button
              onClick={() => {
                tomorrowAppointments.forEach(appt => {
                  if (appt.clientPhone) sendSmsReminder(appt);
                });
                toast.success(`Otwarto SMS dla ${tomorrowAppointments.filter(a => a.clientPhone).length} klientek`);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Wyślij przypomnienia do wszystkich
            </button>
          )}
        </div>
        {tomorrowAppointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Brak wizyt na jutro</p>
        ) : (
          <div className="space-y-3">
            {tomorrowAppointments.map((appt) => {
              const service = services.find(s => s.id === appt.serviceId);
              const employee = employees.find(e => e.id === appt.employeeId);
              return (
                <div key={appt.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center min-w-[50px] shrink-0">
                      <p className="text-sm font-bold">{format(new Date(appt.date), 'HH:mm')}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{appt.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {service?.name} · {employee?.name} · {appt.duration} min
                        {appt.depositStatus === 'paid' && ' · ✅ zaliczka'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </span>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                      title="Wyślij SMS przypomnienie"
                      disabled={!appt.clientPhone}
                      onClick={() => sendSmsReminder(appt)}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dzisiejsze wizyty */}
      <div className="glass-card p-6">
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Dzisiejsze wizyty
        </h2>
        {todayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Brak wizyt na dziś</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appt) => {
              const service = services.find(s => s.id === appt.serviceId);
              const employee = employees.find(e => e.id === appt.employeeId);
              return (
                <div key={appt.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center min-w-[50px] shrink-0">
                      <p className="text-sm font-bold">{format(new Date(appt.date), 'HH:mm')}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{appt.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {service?.name} · {employee?.name} · {appt.duration} min
                        {appt.depositStatus === 'paid' && ' · ✅ zaliczka'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${statusColors[appt.status]}`}>
                    {statusLabels[appt.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
