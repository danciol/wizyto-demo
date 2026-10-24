import { useMemo, useState } from 'react';
import { Calendar, Clock, TrendingUp, Loader2, Database, AlertCircle, CheckCircle, X, MessageSquare, Send, Save } from 'lucide-react';
import { useAppointments, useServices, useEmployees, useSettings } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { seedFirestore } from '@/lib/seedFirestore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { Appointment } from '@/data/services';
import { sendSms, isTextBeeConfigured } from '@/lib/textbee';

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

const DEFAULT_TEMPLATE = 'Przypomnienie: wizyta w salonie Bella Beauty Studio {data} o godz. {godzina} ({zabieg}, {pracownik}). Do zobaczenia!';

const AdminDashboard = () => {
  const { employee: currentEmployee } = useAuth();
  const isAdmin = (currentEmployee?.role || 'pracownik') === 'admin';
  const isSalon = currentEmployee?.role === 'salon';
  const { appointments, loading: loadingA, updateAppointment } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { reminderTemplate, saveReminderTemplate } = useSettings();
  const [seeding, setSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingReminders, setSendingReminders] = useState(false);
  const [smsDialog, setSmsDialog] = useState<{ open: boolean; appts: Appointment[]; message: string }>({
    open: false, appts: [], message: '',
  });
  const [templateDraft, setTemplateDraft] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const currentTemplate = templateDraft ?? (reminderTemplate || DEFAULT_TEMPLATE);

  const loading = loadingA || loadingS || loadingE;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrow = addDays(today, 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const canSeeAll = isAdmin || isSalon;

  const todayAppointments = useMemo(
    () => [...appointments]
      .filter(a => a.date.startsWith(todayStr) && (canSeeAll || a.employeeId === currentEmployee?.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments, todayStr, canSeeAll, currentEmployee]
  );

  const tomorrowAppointments = useMemo(
    () => [...appointments]
      .filter(a => a.date.startsWith(tomorrowStr) && a.status !== 'cancelled' && (canSeeAll || a.employeeId === currentEmployee?.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments, tomorrowStr, canSeeAll, currentEmployee]
  );

  const pendingAppointments = useMemo(
    () => [...appointments]
      .filter(a => a.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments]
  );

  const upcomingAppointments = useMemo(
    () => appointments.filter(a => a.status !== 'cancelled' && a.date >= todayStr),
    [appointments, todayStr]
  );

  const myUpcomingCount = useMemo(
    () => upcomingAppointments.filter(a => a.employeeId === currentEmployee?.id).length,
    [upcomingAppointments, currentEmployee]
  );

  const stats = [
    { label: 'Wizyty dziś', value: todayAppointments.length, icon: Calendar, color: 'text-primary' },
    { label: 'Jutro', value: tomorrowAppointments.length, icon: Clock, color: 'text-blue-500' },
    ...(isAdmin ? [{ label: 'Do potwierdzenia', value: pendingAppointments.length, icon: AlertCircle, color: 'text-destructive' }] : []),
    { label: 'Nadchodzące wizyty', value: isAdmin ? upcomingAppointments.length : myUpcomingCount, icon: TrendingUp, color: 'text-green-600' },
  ];

  const buildReminderText = (appt: Appointment, template?: string) => {
    const service = services.find(s => s.id === appt.serviceId);
    const employee = employees.find(e => e.id === appt.employeeId);
    const d = new Date(appt.date);
    return (template ?? currentTemplate)
      .replace(/\{imie\}/g, appt.clientName)
      .replace(/\{data\}/g, format(d, 'd MMMM', { locale: pl }))
      .replace(/\{godzina\}/g, format(d, 'HH:mm'))
      .replace(/\{zabieg\}/g, service?.name || 'wizyta')
      .replace(/\{pracownik\}/g, employee?.name || '');
  };

  const openSmsDialog = (appts: Appointment[]) => {
    const withPhone = appts.filter(a => a.clientPhone);
    if (withPhone.length === 0) { toast.error('Brak numerów telefonów'); return; }
    const first = withPhone[0];
    setSmsDialog({ open: true, appts: withPhone, message: buildReminderText(first) });
  };

  const confirmSendReminders = async () => {
    const { appts, message } = smsDialog;
    if (!message.trim()) { toast.error('Treść wiadomości jest pusta'); return; }
    setSendingReminders(true);
    try {
      const configured = await isTextBeeConfigured();
      if (!configured) {
        appts.forEach(appt => {
          window.open(`sms:${appt.clientPhone}?body=${encodeURIComponent(message)}`, '_blank');
        });
        toast.success(`Otwarto SMS dla ${appts.length} klientek`);
      } else {
        let sent = 0;
        let failed = 0;
        for (const appt of appts) {
          const result = await sendSms([appt.clientPhone!], message);
          sent += result.sent;
          failed += result.failed;
        }
        if (failed === 0) toast.success(`Wysłano ${sent} SMS-ów`);
        else toast.warning(`Wysłano ${sent}, błąd: ${failed}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Błąd wysyłania SMS');
    } finally {
      setSendingReminders(false);
      setSmsDialog(prev => ({ ...prev, open: false }));
      setSelectedIds(new Set());
    }
  };

  const handleStatus = async (id: string, status: Appointment['status']) => {
    setUpdatingId(id);
    try {
      await updateAppointment(id, { status });
      toast.success(`Wizyta ${status === 'confirmed' ? 'potwierdzona' : 'anulowana'}`);
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

      {/* Podział nadchodzących wizyt per pracownik */}
      {(isAdmin || isSalon) && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Nadchodzące wizyty — podział
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {employees
              .filter(e => (e.role || 'pracownik') !== 'salon')
              .map(emp => {
                const count = upcomingAppointments.filter(a => a.employeeId === emp.id).length;
                return (
                  <div key={emp.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <span className="text-sm truncate">{emp.name}</span>
                    <span className="text-sm font-bold text-primary ml-2 shrink-0">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Sekcja: Do potwierdzenia */}
      {isAdmin && pendingAppointments.length > 0 && (
        <div className="glass-card p-6 border border-destructive/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Do potwierdzenia
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingAppointments.length}
              </span>
            </h2>
            <Link to="/admin/wizyty?status=pending" className="text-xs text-primary hover:underline">
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
                <Link to="/admin/wizyty?status=pending" className="text-primary hover:underline">Zobacz wszystkie</Link>
              </p>
            )}
          </div>
        </div>
      )}

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
              const isUpdating = updatingId === appt.id;
              const isDone = appt.status === 'completed' || appt.status === 'cancelled';
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
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </span>
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />
                    ) : !isDone && (
                      <>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Oznacz jako zakończona"
                          onClick={() => handleStatus(appt.id, 'completed')}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Anuluj wizytę"
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
          </div>
        )}
      </div>

      {/* Szablon przypomnienia SMS */}
      {isAdmin && <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Szablon przypomnienia SMS
          </h2>
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {['{imie}', '{data}', '{godzina}', '{zabieg}', '{pracownik}'].map(v => (
                <span key={v} className="mr-1.5 font-mono bg-secondary px-1 py-0.5 rounded">{v}</span>
              ))}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              disabled={savingTemplate || templateDraft === null}
              onClick={async () => {
                setSavingTemplate(true);
                try {
                  await saveReminderTemplate(currentTemplate);
                  setTemplateDraft(null);
                  toast.success('Szablon zapisany');
                } catch { toast.error('Błąd zapisu'); }
                finally { setSavingTemplate(false); }
              }}
            >
              {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Zapisz
            </Button>
          </div>
        </div>
        <Textarea
          value={currentTemplate}
          onChange={e => setTemplateDraft(e.target.value)}
          rows={2}
          className="resize-none text-sm"
          placeholder={DEFAULT_TEMPLATE}
        />
        <p className="text-xs text-muted-foreground">
          Podgląd: <span className="text-foreground italic">
            {tomorrowAppointments[0]
              ? buildReminderText(tomorrowAppointments[0], currentTemplate)
              : buildReminderText({ clientName: 'Anna K.', date: new Date().toISOString(), serviceId: services[0]?.id || '', employeeId: employees[0]?.id || '', duration: 60, status: 'confirmed', clientPhone: '', clientEmail: '', createdAt: '' } as Appointment, currentTemplate)
            }
          </span>
        </p>
      </div>}

      {/* Dialog: edycja treści SMS */}
      <Dialog open={smsDialog.open} onOpenChange={open => setSmsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Wyślij przypomnienie SMS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Odbiorcy ({smsDialog.appts.length}):&nbsp;
              <span className="text-foreground font-medium">
                {smsDialog.appts.map(a => a.clientName).join(', ')}
              </span>
            </p>
            <Textarea
              value={smsDialog.message}
              onChange={e => setSmsDialog(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="resize-none text-sm"
              placeholder="Treść wiadomości..."
            />
            <p className="text-xs text-muted-foreground text-right">{smsDialog.message.length} znaków</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSmsDialog(prev => ({ ...prev, open: false }))}>
              Anuluj
            </Button>
            <Button onClick={confirmSendReminders} disabled={sendingReminders} className="gap-2">
              {sendingReminders
                ? <><Loader2 className="w-4 h-4 animate-spin" />Wysyłam...</>
                : <><Send className="w-4 h-4" />Wyślij do {smsDialog.appts.length}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {isAdmin && tomorrowAppointments.length > 0 && (
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  disabled={sendingReminders}
                  onClick={() => openSmsDialog(tomorrowAppointments.filter(a => selectedIds.has(a.id)))}
                  className="gap-1.5 h-8 text-xs"
                >
                  {sendingReminders
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Wysyłam...</>
                    : <><Send className="w-3.5 h-3.5" />Wyślij ({selectedIds.size})</>
                  }
                </Button>
              )}
              <button
                onClick={() => {
                  const all = tomorrowAppointments.map(a => a.id);
                  setSelectedIds(prev => prev.size === all.length ? new Set() : new Set(all));
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {selectedIds.size === tomorrowAppointments.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
            </div>
          )}
        </div>
        {tomorrowAppointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Brak wizyt na jutro</p>
        ) : (
          <div className="space-y-3">
            {tomorrowAppointments.map((appt) => {
              const service = services.find(s => s.id === appt.serviceId);
              const employee = employees.find(e => e.id === appt.employeeId);
              const isSelected = selectedIds.has(appt.id);
              return (
                <div
                  key={appt.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors gap-3 ${isAdmin ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-secondary/50 hover:bg-secondary/80'}`}
                  onClick={() => { if (!isAdmin) return; setSelectedIds(prev => { const next = new Set(prev); next.has(appt.id) ? next.delete(appt.id) : next.add(appt.id); return next; }); }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isAdmin && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        className="shrink-0 pointer-events-none"
                      />
                    )}
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
                    {isAdmin && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Wyślij SMS przypomnienie"
                        disabled={!appt.clientPhone || sendingReminders}
                        onClick={e => { e.stopPropagation(); openSmsDialog([appt]); }}
                      >
                        {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
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
