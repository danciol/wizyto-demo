import { useMemo, useState } from 'react';
import { useAppointments, useServices, useEmployees } from '@/hooks/useFirestore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import type { Appointment } from '@/data/services';
import { CheckCircle, X, Loader2, Search, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlan';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, buildCalendarEvent } from '@/lib/googleCalendar';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    const query = search.trim().toLowerCase();

    return [...appointments]
      .filter((appt) => {
        const service = serviceMap.get(appt.serviceId);
        const employee = employeeMap.get(appt.employeeId);

        if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
        if (employeeFilter !== 'all' && appt.employeeId !== employeeFilter) return false;
        if (serviceFilter !== 'all' && appt.serviceId !== serviceFilter) return false;

        if (!query) return true;

        return [
          appt.clientName,
          appt.clientPhone,
          appt.clientEmail,
          service?.name || '',
          employee?.name || '',
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, employeeFilter, employeeMap, search, serviceFilter, serviceMap, statusFilter]);

  const hasActiveFilters = search.trim() || statusFilter !== 'all' || employeeFilter !== 'all' || serviceFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setEmployeeFilter('all');
    setServiceFilter('all');
  };

  const { can } = usePlan();
  const hasGoogleCal = can('online_booking');

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    setUpdatingId(id);
    try {
      await updateAppointment(id, { status });
      toast.success(`Status zmieniony na: ${statusLabels[status].toLowerCase()}`);
      if (hasGoogleCal) {
        const appt = appointments.find(a => a.id === id);
        if (appt) {
          const service = serviceMap.get(appt.serviceId);
          const employee = employees.find(e => e.id === appt.employeeId);
          if (employee && (employee as any).googleCalendarConnected) {
            const calId = (employee as any).googleCalendarId || 'primary';
            const event = buildCalendarEvent({ date: appt.date, duration: appt.duration, clientName: appt.clientName, serviceName: service?.name });
            if (status === 'confirmed') {
              if (appt.googleCalendarEventId) { await updateCalendarEvent(appt.employeeId, appt.googleCalendarEventId, event, calId); }
              else { const eid = await createCalendarEvent(appt.employeeId, event, calId); if (eid) await updateDoc(doc(db, 'appointments', id), { googleCalendarEventId: eid }); }
            } else if (status === 'cancelled' && appt.googleCalendarEventId) {
              await deleteCalendarEvent(appt.employeeId, appt.googleCalendarEventId, calId);
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
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po kliencie, telefonie, usłudze lub pracowniku"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-1">
            <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Appointment['status'])} className="h-10">
              <option value="all">Wszystkie statusy</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </NativeSelect>

            <NativeSelect value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-10">
              <option value="all">Wszyscy pracownicy</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </NativeSelect>

            <NativeSelect value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="h-10 sm:col-span-2 xl:col-span-1">
              <option value="all">Wszystkie usługi</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </NativeSelect>
          </div>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Wyczyść
            </Button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Klient</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Usługa</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Pracownik</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appt) => {
                const service = serviceMap.get(appt.serviceId);
                const employee = employeeMap.get(appt.employeeId);
                const isUpdating = updatingId === appt.id;

                return (
                  <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{format(new Date(appt.date), 'd MMM yyyy', { locale: pl })}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(appt.date), 'HH:mm')}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{appt.clientName}</p>
                      <p className="text-xs text-muted-foreground">{appt.clientPhone}</p>
                      {(appt as any).importSource === 'google_calendar' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium mt-0.5">📅 Google Cal</span>
                      )}
                    </td>
                    <td className="p-3">
                      <p>{service?.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.duration} min &middot; {service?.price} zł</p>
                    </td>
                    <td className="p-3">{employee?.name}</td>
                    <td className="p-3">
                      <div className="min-w-[160px]">
                        <NativeSelect
                          value={appt.status}
                          onChange={(e) => handleStatusChange(appt.id, e.target.value as Appointment['status'])}
                          className="h-9 py-1 pr-8 text-xs font-medium"
                          disabled={isUpdating}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{statusLabels[status]}</option>
                          ))}
                        </NativeSelect>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {isUpdating ? (
                        <div className="flex justify-end">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7" title="Wyślij SMS przypomnienie"
                            disabled={!appt.clientPhone}
                            onClick={() => {
                              const date = format(new Date(appt.date), "d MMM 'o' HH:mm", { locale: pl });
                              const service = serviceMap.get(appt.serviceId);
                              const text = `Przypomnienie: wizyta w salonie Majli Beauty ${date} (${service?.name || 'wizyta'}). Do zobaczenia! 💅`;
                              window.open(`sms:${appt.clientPhone}?body=${encodeURIComponent(text)}`, '_blank');
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Potwierdź" disabled={appt.status === 'confirmed'} onClick={() => handleStatusChange(appt.id, 'confirmed')}>
                            <CheckCircle className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Anuluj" disabled={appt.status === 'cancelled'} onClick={() => handleStatusChange(appt.id, 'cancelled')}>
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredAppointments.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Brak wizyt</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAppointments;
