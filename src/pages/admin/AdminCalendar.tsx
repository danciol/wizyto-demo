import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/data/services';
import { useAppointments, useServices, useEmployees, useClients } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AppointmentDialog, { formatPhoneNumber } from '@/components/admin/AppointmentDialog';
import { NativeSelect } from '@/components/ui/native-select';

const HOUR_HEIGHT = 56; // px per hour row
const hours = Array.from({ length: 13 }, (_, i) => i + 8);
const START_HOUR = 8;

const employeeColors = [
  { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-400', text: 'text-pink-800 dark:text-pink-200' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400', text: 'text-blue-800 dark:text-blue-200' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-400', text: 'text-emerald-800 dark:text-emerald-200' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-400', text: 'text-amber-800 dark:text-amber-200' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', text: 'text-purple-800 dark:text-purple-200' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-400', text: 'text-cyan-800 dark:text-cyan-200' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-400', text: 'text-rose-800 dark:text-rose-200' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-400', text: 'text-indigo-800 dark:text-indigo-200' },
];

function getEmployeeColor(employeeId: string, employees: { id: string }[]) {
  const idx = employees.findIndex(e => e.id === employeeId);
  return employeeColors[idx >= 0 ? idx % employeeColors.length : 0];
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9);
}

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { appointments, loading: loadingA, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { clients, addClient, updateClient } = useClients();
  const { employee: currentUser } = useAuth();
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newApptDate, setNewApptDate] = useState<Date | null>(null);

  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  const isAdmin = currentUser?.role === 'admin';

  const visibleEmployees = isAdmin
    ? employees
    : employees.filter(e =>
        e.id === currentUser?.id ||
        (currentUser?.canViewCalendars || []).includes(e.id)
      );

  const filteredAppointments = appointments.filter(a => {
    const visibleIds = visibleEmployees.map(e => e.id);
    if (!visibleIds.includes(a.employeeId)) return false;
    if (filterEmployeeId !== 'all' && a.employeeId !== filterEmployeeId) return false;
    return true;
  });

  const loading = loadingA || loadingS || loadingE;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // --- Auto-save / update client in DB ---
  const upsertClient = async (name: string, phone: string, email: string) => {
    if (!name || !phone) return;
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return;
    const existing = clients.find(c => normalizePhone(c.phone) === normalized);
    if (existing) {
      // Update name/email if changed
      if (existing.name !== name || existing.email !== (email || existing.email)) {
        await updateClient(existing.id, { name, email: email || existing.email });
      }
    } else {
      await addClient({
        name,
        phone: formatPhoneNumber(normalized),
        email: email || '',
        appointmentIds: [],
      });
    }
  };

  const handleCellClick = (day: Date, hour: number) => {
    const clickDate = new Date(day);
    clickDate.setHours(hour, 0, 0, 0);
    setEditingAppointment(null);
    setNewApptDate(clickDate);
    setApptDialogOpen(true);
  };

  const handleAppointmentClick = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation();
    setNewApptDate(null);
    setEditingAppointment(appt);
    setApptDialogOpen(true);
  };

  const handleSaveAppointment = async (data: Appointment) => {
    try {
      if (editingAppointment) {
        const { id, ...rest } = data;
        await updateAppointment(id, rest);
        toast.success('Wizyta zaktualizowana');
      } else {
        const { id, ...rest } = data;
        await addAppointment(rest);
        toast.success('Wizyta dodana');
      }
      // Auto-save client
      await upsertClient(data.clientName, data.clientPhone, data.clientEmail);
    } catch { toast.error('Błąd zapisu'); }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await deleteAppointment(id);
      toast.success('Wizyta usunięta');
    } catch { toast.error('Błąd usuwania'); }
  };

  const goToToday = () => setCurrentDate(new Date());

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Get appointments for a specific day
  const getDayAppointments = (day: Date) => {
    return filteredAppointments.filter(a => isSameDay(new Date(a.date), day));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">Kalendarz</h1>
          <Button variant="outline" size="sm" onClick={goToToday}>Dziś</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {visibleEmployees.length > 1 && (
            <div className="w-[180px]">
              <NativeSelect value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="h-8 py-1 pr-8 text-sm">
                <option value="all">Wszyscy pracownicy</option>
                {visibleEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addDays(d, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekDays[0], 'd MMM', { locale: pl })} – {format(weekDays[6], 'd MMM yyyy', { locale: pl })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addDays(d, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
            <div className="p-2" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="p-2 text-center border-l border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {format(day, 'EEE', { locale: pl })}
                  </p>
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-lg font-semibold mt-0.5 ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body: time grid with absolutely positioned appointments */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
            {/* Time labels column */}
            <div>
              {hours.map((hour) => (
                <div key={hour} className="pr-2 text-[11px] text-muted-foreground text-right border-b border-border/40" style={{ height: HOUR_HEIGHT }}>
                  <span className="-translate-y-2 inline-block">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dayAppts = getDayAppointments(day);

              return (
                <div key={day.toISOString()} className="border-l border-border/40 relative">
                  {/* Hour cells (for click targets & grid lines) */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border/40 group cursor-pointer hover:bg-secondary/30 transition-colors"
                      style={{ height: HOUR_HEIGHT }}
                      onClick={() => handleCellClick(day, hour)}
                    >
                      <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  ))}

                  {/* Appointments overlay */}
                  {(() => {
                    // Calculate columns for overlapping appointments
                    const sorted = [...dayAppts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const columns: { end: number; appt: typeof sorted[0] }[][] = [];
                    const apptLayout = new Map<string, { col: number; totalCols: number }>();

                    for (const a of sorted) {
                      const aStart = new Date(a.date).getTime();
                      const aEnd = aStart + a.duration * 60000;
                      let placed = false;
                      for (let c = 0; c < columns.length; c++) {
                        const lastInCol = columns[c][columns[c].length - 1];
                        if (aStart >= lastInCol.end) {
                          columns[c].push({ end: aEnd, appt: a });
                          apptLayout.set(a.id, { col: c, totalCols: 0 });
                          placed = true;
                          break;
                        }
                      }
                      if (!placed) {
                        columns.push([{ end: aEnd, appt: a }]);
                        apptLayout.set(a.id, { col: columns.length - 1, totalCols: 0 });
                      }
                    }

                    // Determine totalCols for each group of overlapping appointments
                    for (const a of sorted) {
                      const aStart = new Date(a.date).getTime();
                      const aEnd = aStart + a.duration * 60000;
                      let maxCol = 0;
                      for (const b of sorted) {
                        const bStart = new Date(b.date).getTime();
                        const bEnd = bStart + b.duration * 60000;
                        if (aStart < bEnd && aEnd > bStart) {
                          const bLayout = apptLayout.get(b.id);
                          if (bLayout) maxCol = Math.max(maxCol, bLayout.col);
                        }
                      }
                      const layout = apptLayout.get(a.id)!;
                      layout.totalCols = Math.max(layout.totalCols, maxCol + 1);
                    }
                    // Second pass to propagate totalCols
                    for (const a of sorted) {
                      const aStart = new Date(a.date).getTime();
                      const aEnd = aStart + a.duration * 60000;
                      const aLayout = apptLayout.get(a.id)!;
                      for (const b of sorted) {
                        const bStart = new Date(b.date).getTime();
                        const bEnd = bStart + b.duration * 60000;
                        if (aStart < bEnd && aEnd > bStart) {
                          const bLayout = apptLayout.get(b.id)!;
                          const maxCols = Math.max(aLayout.totalCols, bLayout.totalCols);
                          aLayout.totalCols = maxCols;
                          bLayout.totalCols = maxCols;
                        }
                      }
                    }

                    return dayAppts.map((a) => {
                      const aDate = new Date(a.date);
                      const startHour = aDate.getHours() + aDate.getMinutes() / 60;
                      const topPx = (startHour - START_HOUR) * HOUR_HEIGHT;
                      const heightPx = (a.duration / 60) * HOUR_HEIGHT;
                      const service = services.find(s => s.id === a.serviceId);
                      const employee = employees.find(e => e.id === a.employeeId);
                      const empColor = getEmployeeColor(a.employeeId, employees);
                      const layout = apptLayout.get(a.id) || { col: 0, totalCols: 1 };

                      if (topPx < 0 || topPx >= hours.length * HOUR_HEIGHT) return null;

                      const widthPercent = 100 / layout.totalCols;
                      const leftPercent = layout.col * widthPercent;

                      return (
                        <div
                          key={a.id}
                          onClick={(e) => handleAppointmentClick(e, a)}
                          className={`absolute z-10 rounded-md px-1.5 py-1 text-xs cursor-pointer border-l-[3px] transition-all hover:shadow-md hover:z-20 overflow-hidden ${empColor.bg} ${empColor.border} ${empColor.text}`}
                          style={{
                            top: `${topPx}px`,
                            height: `${Math.max(heightPx, 24)}px`,
                            left: `${leftPercent}%`,
                            width: `calc(${widthPercent}% - 2px)`,
                          }}
                          title={`${a.clientName}${service ? ` – ${service.name}` : ''}${a.notes ? `\n${a.notes}` : ''}`}
                        >
                          <p className="font-bold truncate leading-tight">
                            {a.clientName}
                          </p>
                          <p className="truncate opacity-70 leading-tight">
                            {format(aDate, 'HH:mm')} · {service?.name || 'Wizyta'}
                          </p>
                          {heightPx > 40 && a.clientPhone && (
                            <p className="truncate opacity-70 leading-tight">📞 {formatPhoneNumber(a.clientPhone)}</p>
                          )}
                          {heightPx > 56 && a.notes && (
                            <p className="truncate opacity-60 leading-tight italic">📝 {a.notes}</p>
                          )}
                          {heightPx > 72 && employee && (
                            <p className="truncate opacity-50 leading-tight">{employee.name}</p>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AppointmentDialog
        open={apptDialogOpen}
        onOpenChange={setApptDialogOpen}
        appointment={editingAppointment}
        defaultDate={newApptDate}
        services={services}
        employees={employees}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
      />

    </div>
  );
};

export default AdminCalendar;