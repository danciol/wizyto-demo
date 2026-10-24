import { useMemo, useState } from 'react';
import { useAppointments, useServices, useEmployees, useSettings } from '@/hooks/useFirestore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import type { Appointment } from '@/data/services';
import { CheckCircle, X, Loader2, Search, MessageSquare, Star, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendSms } from '@/lib/textbee';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { salonConfig } from '@/config/salon';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';

const statusLabels: Record<Appointment['status'], string> = {
  pending: 'Oczekuje',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  completed: 'Zakończona',
};

const statusOptions: Appointment['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];

const AdminAppointments = () => {
  const { appointments, loading: loadingA, updateAppointment } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { googleReviewsUrl, textBeeApiKey, textBeeDeviceId } = useSettings();
  const { employee: currentUser } = useAuth();
  const { can } = usePlan();
  const isAdmin = currentUser?.role === 'admin';
  const isSalon = currentUser?.role === 'salon';
  const phoneProtected = can('phone_protection') && !isAdmin && !isSalon;

  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null);

  const revealPhone = async (appt: Appointment) => {
    setRevealedPhones(prev => new Set([...prev, appt.id]));
    await addDoc(collection(db, 'phone_reveals'), {
      employeeName: currentUser?.name || 'Nieznany',
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      revealedAt: new Date().toISOString(),
    });
  };

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>(
    (searchParams.get('status') as Appointment['status'] | null) ?? 'all'
  );
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'date' | 'client' | 'employee' | 'status' | 'createdAt' | 'updatedAt'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const loading = loadingA || loadingS || loadingE;

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const filtered = [...appointments].filter((appt) => {
      const service = serviceMap.get(appt.serviceId);
      const employee = employeeMap.get(appt.employeeId);
      if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
      if (employeeFilter !== 'all' && appt.employeeId !== employeeFilter) return false;
      if (serviceFilter !== 'all' && appt.serviceId !== serviceFilter) return false;
      if (timeFilter === 'upcoming' && new Date(appt.date) < now) return false;
      if (timeFilter === 'past' && new Date(appt.date) >= now) return false;
      if (!q) return true;
      return [appt.clientName, appt.clientPhone, appt.clientEmail, service?.name || '', employee?.name || '']
        .some((v) => v.toLowerCase().includes(q));
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (sortCol) {
        case 'date':      return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case 'client':    return dir * a.clientName.localeCompare(b.clientName, 'pl');
        case 'employee':  return dir * ((employeeMap.get(a.employeeId)?.name ?? '').localeCompare(employeeMap.get(b.employeeId)?.name ?? '', 'pl'));
        case 'status':    return dir * a.status.localeCompare(b.status, 'pl');
        case 'createdAt': return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'updatedAt': return dir * (new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime());
        default:          return 0;
      }
    });
    return filtered;
  }, [appointments, employeeFilter, employeeMap, search, serviceFilter, serviceMap, statusFilter, timeFilter, sortCol, sortDir]);

  const hasActiveFilters = search.trim() || statusFilter !== 'all' || employeeFilter !== 'all' || serviceFilter !== 'all' || timeFilter !== 'all';
  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setEmployeeFilter('all'); setServiceFilter('all'); setTimeFilter('all'); };

  const checkWaitingList = async (appt: Appointment) => {
    try {
      const snap = await getDocs(
        query(collection(db, 'waiting_list'),
          where('serviceId', '==', appt.serviceId),
          where('employeeId', '==', appt.employeeId),
          where('notified', '==', false)
        )
      );
      if (snap.size > 0) {
        toast.info(`${snap.size} ${snap.size === 1 ? 'osoba czeka' : 'osoby czekają'} na ten termin`, {
          action: { label: 'Powiadom', onClick: () => navigate('/admin/oczekujacy') },
          duration: 8000,
        });
      }
    } catch { /* brak uprawnień lub brak internetu */ }
  };

  const sendReviewSms = async (appt: Appointment) => {
    if (!googleReviewsUrl || !appt.clientPhone || (appt as any).reviewSmsSent) return;
    const service = serviceMap.get(appt.serviceId);
    const message = `Dziękujemy za wizytę w ${salonConfig.name}! Jeśli jesteś zadowolona, zostaw nam opinię 🙏 ${googleReviewsUrl}`;
    try {
      await sendSms([appt.clientPhone], message);
      await updateDoc(doc(db, 'appointments', appt.id), { reviewSmsSent: true });
      toast.success(`SMS z prośbą o opinię wysłany do ${appt.clientName}`);
    } catch {
      if (textBeeApiKey && textBeeDeviceId) {
        toast.error('Błąd wysyłania SMS z opinią');
      }
    }
  };

  const handleStatusChange = async (appt: Appointment, status: Appointment['status']) => {
    if (status === 'cancelled') { setConfirmCancel(appt); return; }
    setUpdatingId(appt.id);
    try {
      await updateAppointment(appt.id, { status });
      toast.success(`Status zmieniony na: ${statusLabels[status].toLowerCase()}`);
      if (status === 'completed') await sendReviewSms(appt);
    } catch { toast.error('Błąd zmiany statusu'); } finally { setUpdatingId(null); }
  };

  const confirmCancelAppointment = async () => {
    if (!confirmCancel) return;
    setUpdatingId(confirmCancel.id);
    try {
      await updateAppointment(confirmCancel.id, { status: 'cancelled' });
      toast.success('Wizyta anulowana');
      await checkWaitingList(confirmCancel);
    } catch { toast.error('Błąd zmiany statusu'); } finally { setUpdatingId(null); setConfirmCancel(null); }
  };

  const handleManualReviewSms = async (appt: Appointment) => {
    if (!googleReviewsUrl) { toast.error('Wpisz link Google Reviews w Ustawieniach'); return; }
    const message = `Dziękujemy za wizytę w ${salonConfig.name}! Jeśli jesteś zadowolona, zostaw nam opinię 🙏 ${googleReviewsUrl}`;
    try {
      await sendSms([appt.clientPhone], message);
      await updateDoc(doc(db, 'appointments', appt.id), { reviewSmsSent: true });
      toast.success('SMS z prośbą o opinię wysłany');
    } catch {
      window.open(`sms:${appt.clientPhone}?body=${encodeURIComponent(message)}`, '_blank');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Wizyty</h1>
          <p className="text-sm text-muted-foreground mt-1">Wyników: {filteredAppointments.length}</p>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:max-w-sm">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj po kliencie, telefonie, usłudze lub pracowniku" className="pl-9" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-1">
            <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Appointment['status'])} className="h-10">
              <option value="all">Wszystkie statusy</option>
              {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </NativeSelect>
            <NativeSelect value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-10">
              <option value="all">Wszyscy pracownicy</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect>
            <NativeSelect value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="h-10 sm:col-span-2 xl:col-span-1">
              <option value="all">Wszystkie usługi</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </NativeSelect>
            <NativeSelect value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as 'all' | 'upcoming' | 'past')} className="h-10">
              <option value="all">Wszystkie terminy</option>
              <option value="upcoming">Nadchodzące</option>
              <option value="past">Minione</option>
            </NativeSelect>
          </div>
          {hasActiveFilters && <Button variant="outline" size="sm" onClick={resetFilters}>Wyczyść</Button>}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {([
                  ['date', 'Data'],
                  ['client', 'Klient'],
                  ['', 'Usługa'],
                  ['employee', 'Pracownik'],
                  ['status', 'Status'],
                  ['createdAt', 'Dodano'],
                  ['updatedAt', 'Edytowano'],
                ] as [string, string][]).map(([col, label]) => (
                  <th
                    key={col || label}
                    className={`p-3 font-medium text-muted-foreground text-left ${col ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                    onClick={col ? () => handleSort(col as typeof sortCol) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {col && (
                        sortCol === col
                          ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          : <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
                <th className="text-right p-3 font-medium text-muted-foreground">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appt) => {
                const service = serviceMap.get(appt.serviceId);
                const employee = employeeMap.get(appt.employeeId);
                const isUpdating = updatingId === appt.id;
                const reviewSent = (appt as any).reviewSmsSent;

                return (
                  <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{format(new Date(appt.date), 'd MMM yyyy', { locale: pl })}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(appt.date), 'HH:mm')}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{appt.clientName}</p>
                      {phoneProtected && !revealedPhones.has(appt.id) ? (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => revealPhone(appt)}
                        >
                          Pokaż nr
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground">{appt.clientPhone}</p>
                      )}
                      {(appt as any).importSource === 'google_calendar' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium mt-0.5">📅 Google Cal</span>
                      )}
                    </td>
                    <td className="p-3">
                      <p>{service?.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.duration} min · {service?.price} zł</p>
                    </td>
                    <td className="p-3">{employee?.name}</td>
                    <td className="p-3">
                      <div className="min-w-[160px]">
                        <NativeSelect
                          value={appt.status}
                          onChange={(e) => handleStatusChange(appt, e.target.value as Appointment['status'])}
                          className="h-9 py-1 pr-8 text-xs font-medium"
                          disabled={isUpdating}
                        >
                          {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                        </NativeSelect>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {appt.createdAt ? format(new Date(appt.createdAt), 'd MMM yyyy', { locale: pl }) : '—'}
                      <p className="opacity-70">{appt.createdAt ? format(new Date(appt.createdAt), 'HH:mm') : ''}</p>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {appt.updatedAt ? format(new Date(appt.updatedAt), 'd MMM yyyy', { locale: pl }) : '—'}
                      <p className="opacity-70">{appt.updatedAt ? format(new Date(appt.updatedAt), 'HH:mm') : ''}</p>
                    </td>
                    <td className="p-3 text-right">
                      {isUpdating ? (
                        <div className="flex justify-end"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title="Wyślij SMS przypomnienie"
                            disabled={!appt.clientPhone}
                            onClick={() => {
                              const date = format(new Date(appt.date), "d MMM 'o' HH:mm", { locale: pl });
                              const text = `Przypomnienie: wizyta w salonie ${salonConfig.name} ${date} (${service?.name || 'wizyta'}). Do zobaczenia! 💅`;
                              window.open(`sms:${appt.clientPhone}?body=${encodeURIComponent(text)}`, '_blank');
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          </Button>
                          {appt.status === 'completed' && googleReviewsUrl && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              title={reviewSent ? 'Opinia wysłana' : 'Wyślij prośbę o opinię'}
                              disabled={!appt.clientPhone}
                              onClick={() => handleManualReviewSms(appt)}
                            >
                              <Star className={`w-3.5 h-3.5 ${reviewSent ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-500'}`} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Potwierdź" disabled={appt.status === 'confirmed' || appt.status === 'completed' || appt.status === 'cancelled'} onClick={() => handleStatusChange(appt, 'confirmed')}>
                            <CheckCircle className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Anuluj" disabled={appt.status === 'cancelled'} onClick={() => handleStatusChange(appt, 'cancelled')}>
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredAppointments.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Brak wizyt</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!confirmCancel} onOpenChange={open => { if (!open) setConfirmCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulować wizytę?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCancel && <>Wizyta klienta <strong>{confirmCancel.clientName}</strong> zostanie oznaczona jako anulowana. Tej operacji nie można cofnąć.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie, zostaw</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmCancelAppointment}>
              Tak, anuluj wizytę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAppointments;
