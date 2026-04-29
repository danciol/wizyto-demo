import { useMemo } from 'react';
import { useAppointments, useServices, useEmployees } from '@/hooks/useFirestore';
import { TrendingUp, Users, Scissors, CreditCard, Loader2, Eye } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState, useEffect } from 'react';

interface PhoneReveal {
  id: string;
  employeeName: string;
  clientName: string;
  clientPhone: string;
  revealedAt: string;
}

const AdminReports = () => {
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const [phoneReveals, setPhoneReveals] = useState<PhoneReveal[]>([]);
  const [period, setPeriod] = useState<'current' | 'last'>('current');

  useEffect(() => {
    const q = query(collection(db, 'phone_reveals'), orderBy('revealedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPhoneReveals(snap.docs.map(d => ({ id: d.id, ...d.data() } as PhoneReveal)));
    });
    return unsub;
  }, []);

  const loading = loadingA || loadingS || loadingE;

  const periodStart = period === 'current' ? startOfMonth(new Date()) : startOfMonth(subMonths(new Date(), 1));
  const periodEnd   = period === 'current' ? endOfMonth(new Date())   : endOfMonth(subMonths(new Date(), 1));

  const periodAppointments = useMemo(() =>
    appointments.filter(a => {
      const d = new Date(a.date);
      return isWithinInterval(d, { start: periodStart, end: periodEnd }) && a.status !== 'cancelled';
    }), [appointments, periodStart, periodEnd]);

  const revenue = useMemo(() =>
    periodAppointments.reduce((sum, a) => {
      const s = services.find(s => s.id === a.serviceId);
      return sum + (s?.price || 0);
    }, 0), [periodAppointments, services]);

  const deposits = useMemo(() =>
    periodAppointments.reduce((sum, a) => sum + (a.depositStatus === 'paid' ? (a.depositAmount || 0) : 0), 0),
    [periodAppointments]);

  const byEmployee = useMemo(() =>
    employees.map(e => {
      const appts = periodAppointments.filter(a => a.employeeId === e.id);
      const rev = appts.reduce((sum, a) => sum + (services.find(s => s.id === a.serviceId)?.price || 0), 0);
      const reveals = phoneReveals.filter(r => r.employeeName === e.name).length;
      return { ...e, count: appts.length, revenue: rev, reveals };
    }).sort((a, b) => b.count - a.count), [employees, periodAppointments, services, phoneReveals]);

  const byService = useMemo(() =>
    services.map(s => {
      const count = periodAppointments.filter(a => a.serviceId === s.id).length;
      return { ...s, count, total: count * s.price };
    }).filter(s => s.count > 0).sort((a, b) => b.count - a.count),
    [services, periodAppointments]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />Raporty
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(periodStart, 'LLLL yyyy', { locale: pl })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPeriod('current')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period==='current' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            Bieżący miesiąc
          </button>
          <button onClick={() => setPeriod('last')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period==='last' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            Poprzedni miesiąc
          </button>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Wizyty', value: periodAppointments.length, icon: Scissors, color: 'text-primary' },
          { label: 'Przychód', value: `${revenue} zł`, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Zaliczki', value: `${deposits} zł`, icon: CreditCard, color: 'text-accent' },
          { label: 'Odkrycia tel.', value: phoneReveals.length, icon: Eye, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raport pracowniczy */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Pracownicy</h2>
          {byEmployee.length === 0
            ? <p className="text-muted-foreground text-sm text-center py-8">Brak danych</p>
            : <div className="space-y-3">
                {byEmployee.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.count} wizyt · {e.revenue} zł
                        {e.reveals > 0 && <span className="text-destructive ml-1">· {e.reveals}x odkryto tel.</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{e.revenue} zł</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Raport usług */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Scissors className="w-4 h-4 text-primary" />Najpopularniejsze usługi</h2>
          {byService.length === 0
            ? <p className="text-muted-foreground text-sm text-center py-8">Brak danych</p>
            : <div className="space-y-3">
                {byService.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count}x · {s.price} zł/szt</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{s.total} zł</p>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Log odkryć telefonów */}
      {phoneReveals.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-destructive" />
            Log odkryć numerów telefonu
          </h2>
          <div className="space-y-2">
            {phoneReveals.slice(0, 20).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm">
                <div>
                  <span className="font-medium">{r.employeeName}</span>
                  <span className="text-muted-foreground"> odkrył numer </span>
                  <span className="font-medium">{r.clientName}</span>
                  <span className="text-muted-foreground"> ({r.clientPhone})</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {format(new Date(r.revealedAt), 'd MMM HH:mm', { locale: pl })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
