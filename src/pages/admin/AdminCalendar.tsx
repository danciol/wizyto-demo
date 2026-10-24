import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Appointment, getEffectiveHours } from '@/data/services';
import { useAppointments, useServices, useEmployees, useClients, useTimeBlocks } from '@/hooks/useFirestore';
import type { TimeBlock } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { toast } from 'sonner';
import AppointmentDialog, { formatPhoneNumber } from '@/components/admin/AppointmentDialog';
import { NativeSelect } from '@/components/ui/native-select';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const HOUR_HEIGHT = 64;
const hours = Array.from({ length: 17 }, (_, i) => i + 6);
const START_HOUR = 6;

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

function buildLayout(appts: Appointment[]) {
  if (!appts.length) return new Map<string, { col: number; totalCols: number }>();

  const sorted = [...appts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const layout = new Map<string, { col: number; totalCols: number }>();

  // Group appointments into clusters of overlapping intervals
  const groups: Appointment[][] = [];
  let group: Appointment[] = [];
  let groupEnd = 0;

  for (const a of sorted) {
    const aStart = new Date(a.date).getTime();
    const aEnd = aStart + a.duration * 60000;
    if (group.length === 0 || aStart < groupEnd) {
      group.push(a);
      groupEnd = Math.max(groupEnd, aEnd);
    } else {
      groups.push(group);
      group = [a];
      groupEnd = aEnd;
    }
  }
  if (group.length) groups.push(group);

  // Within each cluster: greedy column assignment, then set totalCols = columns used
  for (const g of groups) {
    const colEnds: number[] = [];
    for (const a of g) {
      const aStart = new Date(a.date).getTime();
      const aEnd = aStart + a.duration * 60000;
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (aStart >= colEnds[c]) {
          colEnds[c] = aEnd;
          layout.set(a.id, { col: c, totalCols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        colEnds.push(aEnd);
        layout.set(a.id, { col: colEnds.length - 1, totalCols: 0 });
      }
    }
    const totalCols = colEnds.length;
    for (const a of g) layout.get(a.id)!.totalCols = totalCols;
  }

  return layout;
}

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const { appointments, loading: loadingA, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { clients, addClient, updateClient } = useClients();
  const { timeBlocks } = useTimeBlocks();
  const { employee: currentUser } = useAuth();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { can } = usePlan();
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newApptDate, setNewApptDate] = useState<Date | null>(null);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');


  const isAdmin = currentUser?.role === 'admin';
  const isSalon = currentUser?.role === 'salon';
  const visibleEmployees = (isAdmin || isSalon
    ? employees
    : employees.filter(e => e.id === currentUser?.id || (currentUser?.canViewCalendars || []).includes(e.id))
  ).filter(e => (e.role || 'pracownik') !== 'salon');

  const filteredAppointments = appointments.filter(a => {
    if (!visibleEmployees.map(e => e.id).includes(a.employeeId)) return false;
    if (filterEmployeeId !== 'all' && a.employeeId !== filterEmployeeId) return false;
    return true;
  });

  const loading = loadingA || loadingS || loadingE;

  // Week: Mon–Sun (7 days)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const upsertClient = async (name: string, phone: string, email: string) => {
    if (!name || !phone) return;
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return;
    const existing = clients.find(c => normalizePhone(c.phone) === normalized);
    if (existing) {
      if (existing.name !== name || existing.email !== (email || existing.email))
        await updateClient(existing.id, { name, email: email || existing.email });
    } else {
      await addClient({ name, phone: formatPhoneNumber(normalized), email: email || '', appointmentIds: [] });
    }
  };

  const openNew = (day: Date, hour: number) => {
    const d = new Date(day); d.setHours(hour, 0, 0, 0);
    setEditingAppointment(null); setNewApptDate(d); setApptDialogOpen(true);
  };

  const openEdit = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation();
    setNewApptDate(null); setEditingAppointment(appt); setApptDialogOpen(true);
  };

  const handleSaveAppointment = async (data: Appointment) => {
    try {
      if (editingAppointment) { const { id, ...rest } = data; await updateAppointment(id, rest); toast.success('Wizyta zaktualizowana'); }
      else { const { id: _id, ...rest } = data; await addAppointment(rest); toast.success('Wizyta dodana'); }
      await upsertClient(data.clientName, data.clientPhone, data.clientEmail);
    } catch { toast.error('Błąd zapisu'); }
  };

  const handleDeleteAppointment = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try { await deleteAppointment(confirmDeleteId); toast.success('Wizyta usunięta'); }
    catch { toast.error('Błąd usuwania'); }
    finally { setConfirmDeleteId(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const getDayAppointments = (day: Date, empId?: string) =>
    filteredAppointments.filter(a =>
      isSameDay(new Date(a.date), day) && (empId ? a.employeeId === empId : true)
    );

  const isDayOff = (day: Date, empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return (emp?.daysOff || []).includes(format(day, 'yyyy-MM-dd'));
  };

  const dayViewEmployees = filterEmployeeId !== 'all'
    ? visibleEmployees.filter(e => e.id === filterEmployeeId)
    : visibleEmployees;

  const navigate = (dir: 1 | -1) => {
    setCurrentDate(d => addDays(d, viewMode === 'day' ? dir : dir * 7));
  };

  const rangeLabel = viewMode === 'week'
    ? `${format(weekDays[0], 'd MMM', { locale: pl })} – ${format(weekDays[6], 'd MMM yyyy', { locale: pl })}`
    : format(currentDate, 'EEEE, d MMMM yyyy', { locale: pl });

  const ApptCard = ({ a, topPx, heightPx, widthPct, leftPct }: {
    a: Appointment; topPx: number; heightPx: number; widthPct: number; leftPct: number;
  }) => {
    const aDate = new Date(a.date);
    const service = services.find(s => s.id === a.serviceId);
    const employee = employees.find(e => e.id === a.employeeId);
    const empColor = getEmployeeColor(a.employeeId, employees);
    const h = Math.max(heightPx, 24);
    return (
      <div
        onClick={(e) => openEdit(e, a)}
        className={`absolute z-10 rounded-md px-2 py-1 text-xs cursor-pointer border-l-[3px] transition-all hover:shadow-md hover:z-20 overflow-hidden ${empColor.bg} ${empColor.border} ${empColor.text}`}
        style={{ top: `${topPx}px`, height: `${h}px`, left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 3px)` }}
        title={`${a.clientName}${service ? ` – ${service.name}` : ''}${a.notes ? `\n${a.notes}` : ''}`}
      >
        <p className="font-bold truncate leading-tight">{a.clientName}</p>
        {h > 28 && <p className="truncate opacity-75 leading-tight">{format(aDate, 'HH:mm')} · {service?.name || 'Wizyta'}</p>}
        {h > 48 && a.clientPhone && !(can('phone_protection') && !isAdmin && !isSalon) && <p className="truncate opacity-65 leading-tight">📞 {formatPhoneNumber(a.clientPhone)}</p>}
        {h > 64 && a.notes && <p className="truncate opacity-60 leading-tight italic">📝 {a.notes}</p>}
        {h > 80 && employee && viewMode === 'week' && <p className="truncate opacity-50 leading-tight">{employee.name}</p>}
      </div>
    );
  };

  const TimeBlockCard = ({ block, topPx, heightPx }: { block: TimeBlock; topPx: number; heightPx: number }) => {
    const h = Math.max(heightPx, 20);
    return (
      <div
        className="absolute z-[8] rounded-md px-2 py-1 text-xs bg-secondary/80 border border-border/60 pointer-events-none"
        style={{ top: `${topPx}px`, height: `${h}px`, left: '1px', right: '1px' }}
      >
        {h > 24 && (
          <p className="truncate text-muted-foreground font-medium">{block.note || 'Zablokowany termin'}</p>
        )}
      </div>
    );
  };

  const WorkingHoursOverlay = ({ wh }: { wh: { start: string; end: string } | null }) => {
    if (!wh) return null;
    const parse = (t: string) => { const [h, m] = t.split(':').map(Number); return h + (m || 0) / 60; };
    const startFrac = parse(wh.start);
    const endFrac = parse(wh.end);
    const totalPx = hours.length * HOUR_HEIGHT;
    const beforeH = Math.max(0, (startFrac - START_HOUR) * HOUR_HEIGHT);
    const afterTop = Math.min(totalPx, (endFrac - START_HOUR) * HOUR_HEIGHT);
    return (
      <>
        {beforeH > 0 && <div className="absolute inset-x-0 z-[4] bg-secondary/60 pointer-events-none" style={{ top: 0, height: beforeH }} />}
        {afterTop < totalPx && <div className="absolute inset-x-0 z-[4] bg-secondary/60 pointer-events-none" style={{ top: afterTop, bottom: 0 }} />}
      </>
    );
  };

  const TimeColumn = ({ day, empId }: { day: Date; empId?: string }) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const appts = getDayAppointments(day, empId);
    const layout = buildLayout(appts);

    // Show day-off overlay when a specific employee is known for this column
    const effectiveEmpId = empId || (filterEmployeeId !== 'all' ? filterEmployeeId : null);
    const isOff = effectiveEmpId ? isDayOff(day, effectiveEmpId) : false;
    const colEmp = effectiveEmpId ? employees.find(e => e.id === effectiveEmpId) : null;
    const workingHours = colEmp && !isOff ? getEffectiveHours(colEmp, day) : null;

    const dayBlocks = can('time_blocks')
      ? timeBlocks.filter(b => b.date === dayStr && (!effectiveEmpId || b.employeeId === effectiveEmpId))
      : [];

    return (
      <div className="border-l border-border/40 relative">
        <WorkingHoursOverlay wh={workingHours} />
        {isOff && (
          <div className="absolute inset-0 z-[5] bg-secondary/70 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] text-muted-foreground font-medium opacity-60 select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              dzień wolny
            </span>
          </div>
        )}
        {hours.map(hour => (
          <div
            key={hour}
            className="border-b border-border/40 group cursor-pointer hover:bg-secondary/30 transition-colors"
            style={{ height: HOUR_HEIGHT }}
            onClick={() => !isOff && openNew(day, hour)}
          >
            {!isOff && (
              <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
        {dayBlocks.map(block => {
          const [sh, sm] = block.startTime.split(':').map(Number);
          const [eh, em] = block.endTime.split(':').map(Number);
          const topPx = (sh + sm / 60 - START_HOUR) * HOUR_HEIGHT;
          const heightPx = (eh + em / 60 - sh - sm / 60) * HOUR_HEIGHT;
          if (topPx < 0) return null;
          return <TimeBlockCard key={block.id} block={block} topPx={topPx} heightPx={heightPx} />;
        })}
        {appts.map(a => {
          const aDate = new Date(a.date);
          const startHour = aDate.getHours() + aDate.getMinutes() / 60;
          const topPx = (startHour - START_HOUR) * HOUR_HEIGHT;
          const heightPx = (a.duration / 60) * HOUR_HEIGHT;
          if (topPx < 0 || topPx >= hours.length * HOUR_HEIGHT) return null;
          const l = layout.get(a.id) || { col: 0, totalCols: 1 };
          const widthPct = 100 / l.totalCols;
          const leftPct = l.col * widthPct;
          return <ApptCard key={a.id} a={a} topPx={topPx} heightPx={heightPx} widthPct={widthPct} leftPct={leftPct} />;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold">Kalendarz</h1>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Dziś</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            <button
              className={`px-3 py-1.5 transition-colors ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              onClick={() => setViewMode('week')}
            >Tydzień</button>
            <button
              className={`px-3 py-1.5 border-l border-border transition-colors ${viewMode === 'day' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              onClick={() => setViewMode('day')}
            >Dzień</button>
          </div>

          {visibleEmployees.length > 1 && (
            <NativeSelect value={filterEmployeeId} onChange={e => setFilterEmployeeId(e.target.value)} className="h-8 py-1 pr-8 text-sm w-[180px]">
              <option value="all">Wszyscy pracownicy</option>
              {visibleEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect>
          )}

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium min-w-[200px] text-center capitalize">{rangeLabel}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto">
        {viewMode === 'week' ? (
          // --- WEEK VIEW: Mon–Sun ---
          <div style={{ minWidth: 800 }}>
            <div className="grid border-b border-border sticky top-0 bg-card z-10" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
              <div className="p-2" />
              {weekDays.map(day => {
                const isToday = isSameDay(day, new Date());
                const effectiveEmpId = filterEmployeeId !== 'all' ? filterEmployeeId : null;
                const isOff = effectiveEmpId ? isDayOff(day, effectiveEmpId) : false;
                const filteredEmp = effectiveEmpId ? employees.find(e => e.id === effectiveEmpId) : null;
                const wh = filteredEmp && !isOff ? getEffectiveHours(filteredEmp, day) : null;
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-l border-border cursor-pointer hover:bg-secondary/40 transition-colors ${isOff ? 'bg-secondary/30' : ''}`}
                    onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{format(day, 'EEE', { locale: pl })}</p>
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-lg font-semibold mt-0.5 ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    {wh && <p className="text-[10px] text-primary/70 font-semibold mt-0.5">{wh.start}–{wh.end}</p>}
                    {isOff && <p className="text-[10px] text-muted-foreground mt-0.5">wolne</p>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, 1fr)` }} className="relative">
              <div>
                {hours.map(hour => (
                  <div key={hour} className="relative pr-2 border-b border-border/40" style={{ height: HOUR_HEIGHT }}>
                    <span className={`absolute top-0 right-2 text-[11px] text-muted-foreground leading-none ${hour === START_HOUR ? 'pt-0.5' : '-translate-y-1/2'}`}>{hour}:00</span>
                  </div>
                ))}
              </div>
              {weekDays.map(day => <TimeColumn key={day.toISOString()} day={day} />)}
            </div>
          </div>
        ) : (
          // --- DAY VIEW: one column per employee ---
          <div style={{ minWidth: Math.max(500, 56 + dayViewEmployees.length * 160) }}>
            <div className="sticky top-0 bg-card z-10 border-b border-border"
              style={{ display: 'grid', gridTemplateColumns: `56px repeat(${dayViewEmployees.length}, 1fr)` }}>
              <div className="p-2" />
              {dayViewEmployees.map(emp => {
                const empColor = getEmployeeColor(emp.id, employees);
                const isOff = isDayOff(currentDate, emp.id);
                const wh = !isOff ? getEffectiveHours(emp, currentDate) : null;
                return (
                  <div key={emp.id} className={`p-3 text-center border-l border-border ${isOff ? 'bg-secondary/30' : ''}`}>
                    <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${empColor.bg} ${empColor.text}`}>
                      {emp.name}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isOff ? 'dzień wolny' : (
                        <>
                          {wh && <span className="text-primary/70 font-semibold">{wh.start}–{wh.end} · </span>}
                          {getDayAppointments(currentDate, emp.id).length} wizyt
                        </>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${dayViewEmployees.length}, 1fr)` }} className="relative">
              <div>
                {hours.map(hour => (
                  <div key={hour} className="relative pr-2 border-b border-border/40" style={{ height: HOUR_HEIGHT }}>
                    <span className={`absolute top-0 right-2 text-[11px] text-muted-foreground leading-none ${hour === START_HOUR ? 'pt-0.5' : '-translate-y-1/2'}`}>{hour}:00</span>
                  </div>
                ))}
              </div>
              {dayViewEmployees.map(emp => <TimeColumn key={emp.id} day={currentDate} empId={emp.id} />)}
            </div>
          </div>
        )}
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
        hidePhone={can('phone_protection') && !isAdmin && !isSalon}
        onRevealPhone={async (clientName, clientPhone) => {
          await addDoc(collection(db, 'phone_reveals'), {
            employeeName: currentUser?.name || 'Nieznany',
            clientName,
            clientPhone,
            revealedAt: new Date().toISOString(),
          });
        }}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wizytę?</AlertDialogTitle>
            <AlertDialogDescription>
              Wizyta zostanie trwale usunięta. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie, zostaw</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDelete}>
              Tak, usuń wizytę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCalendar;
