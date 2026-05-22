import { useState } from 'react';
import type { Employee } from '@/data/services';
import { useEmployees } from '@/hooks/useFirestore';
import { Plus, Edit2, Trash2, User, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { listCalendars, GoogleCalendarListEntry } from '@/lib/googleCalendar';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSettings } from '@/hooks/useFirestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const DAYS = [
  { key: 'monday', label: 'Poniedziałek' },
  { key: 'tuesday', label: 'Wtorek' },
  { key: 'wednesday', label: 'Środa' },
  { key: 'thursday', label: 'Czwartek' },
  { key: 'friday', label: 'Piątek' },
  { key: 'saturday', label: 'Sobota' },
  { key: 'sunday', label: 'Niedziela' },
];

const dayLabelsShort: Record<string, string> = {
  monday: 'Pon', tuesday: 'Wt', wednesday: 'Śr', thursday: 'Czw',
  friday: 'Pt', saturday: 'Sob', sunday: 'Nd',
  mon: 'Pon', tue: 'Wt', wed: 'Śr', thu: 'Czw',
  fri: 'Pt', sat: 'Sob', sun: 'Nd',
};

interface ShiftEntry {
  start: string;
  end: string;
  days: string[];
}

interface EmployeeForm {
  name: string;
  role: string;
  login: string;
  password: string;
  phone: string;
  workingHours: Record<string, string>;
  daysOff: string;
  canViewCalendars: string[];
  shiftMode: boolean;
  shiftCount: number;
  shiftEntries: ShiftEntry[];
  weekAStartDate: string;
}

function snapToMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().split('T')[0];
}

const defaultWorkingHours: Record<string, string> = {
  monday: '9:00-17:00',
  tuesday: '9:00-17:00',
  wednesday: '9:00-17:00',
  thursday: '9:00-17:00',
  friday: '9:00-17:00',
  saturday: 'wolne',
  sunday: 'wolne',
};

const AdminEmployees = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { googleConnected } = useSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [calPickerEmpId, setCalPickerEmpId] = useState<string | null>(null);
  const [calList, setCalList] = useState<GoogleCalendarListEntry[]>([]);
  const [calPickerLoading, setCalPickerLoading] = useState(false);
  const defaultShiftEntries: ShiftEntry[] = [
    { start: '08:00', end: '16:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { start: '12:00', end: '20:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
  ];
  const [form, setForm] = useState<EmployeeForm>({
    name: '', role: 'pracownik', login: '', password: '', phone: '',
    workingHours: { ...defaultWorkingHours }, daysOff: '', canViewCalendars: [],
    shiftMode: false, shiftCount: 2, shiftEntries: defaultShiftEntries, weekAStartDate: '',
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', role: 'pracownik', login: '', password: '', phone: '',
      workingHours: { ...defaultWorkingHours }, daysOff: '', canViewCalendars: [],
      shiftMode: false, shiftCount: 2, shiftEntries: defaultShiftEntries, weekAStartDate: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    // Convert workingHours to string format if needed
    const wh: Record<string, string> = {};
    for (const [day, val] of Object.entries(e.workingHours)) {
      wh[day] = typeof val === 'string' ? val : `${val.start}-${val.end}`;
    }
    const ss = e.shiftSchedule;
    let shiftCount = 2;
    let shiftEntries: ShiftEntry[] = [...defaultShiftEntries];
    if (ss?.type === 'alternating') {
      if (ss.shifts && ss.shifts.length > 0) {
        shiftCount = ss.shifts.length;
        shiftEntries = ss.shifts.map(s => ({ ...s }));
      } else {
        const activeDays = Object.keys(wh);
        shiftEntries = [
          { start: ss.shiftA?.start ?? '08:00', end: ss.shiftA?.end ?? '16:00', days: activeDays },
          { start: ss.shiftB?.start ?? '12:00', end: ss.shiftB?.end ?? '20:00', days: activeDays },
        ];
      }
    }
    setForm({
      name: e.name,
      role: e.role || 'pracownik',
      login: e.login || '',
      password: e.password || '',
      phone: e.phone || '',
      workingHours: wh,
      daysOff: (e.daysOff || []).join(', '),
      canViewCalendars: e.canViewCalendars || [],
      shiftMode: ss?.type === 'alternating',
      shiftCount,
      shiftEntries,
      weekAStartDate: ss?.weekAStartDate ?? '',
    });
    setDialogOpen(true);
  };

  const setWH = (day: string, value: string) => {
    setForm(f => ({ ...f, workingHours: { ...f.workingHours, [day]: value } }));
  };

  const updateShiftEntry = (index: number, field: 'start' | 'end', value: string) => {
    setForm(f => ({
      ...f,
      shiftEntries: f.shiftEntries.map((e, i) => i === index ? { ...e, [field]: value } : e),
    }));
  };

  const toggleShiftDay = (index: number, day: string) => {
    setForm(f => ({
      ...f,
      shiftEntries: f.shiftEntries.map((e, i) => {
        if (i !== index) return e;
        return { ...e, days: e.days.includes(day) ? e.days.filter(d => d !== day) : [...e.days, day] };
      }),
    }));
  };

  const handleShiftCountChange = (count: number) => {
    setForm(f => {
      const entries = [...f.shiftEntries];
      while (entries.length < count) entries.push({ start: '08:00', end: '16:00', days: [] });
      return { ...f, shiftCount: count, shiftEntries: entries.slice(0, count) };
    });
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Wprowadź imię'); return; }
    try {
      const daysOff = form.daysOff.split(',').map(s => s.trim()).filter(Boolean);
      const shiftSchedule = (form.shiftMode && form.weekAStartDate)
        ? {
            type: 'alternating' as const,
            shifts: form.shiftEntries.slice(0, form.shiftCount).map(e => ({
              start: e.start || '08:00',
              end: e.end || '16:00',
              days: e.days,
            })),
            weekAStartDate: snapToMonday(form.weekAStartDate),
          }
        : null;
      const data: Record<string, unknown> = {
        name: form.name,
        role: form.role,
        login: form.login,
        password: form.password,
        phone: form.phone.trim() || null,
        workingHours: form.workingHours,
        daysOff,
        canViewCalendars: form.canViewCalendars,
        shiftSchedule,
      };
      if (editing) {
        await updateEmployee(editing.id, data as Partial<Employee>);
        toast.success('Pracownik zaktualizowany');
      } else {
        data.canViewCalendars = [];
        await addEmployee(data as Omit<Employee, 'id'>);
        toast.success('Pracownik dodany');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Błąd zapisu');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast.success('Pracownik usunięty');
    } catch {
      toast.error('Błąd usuwania');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Pracownicy</h1>
        <Button onClick={openNew} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Dodaj pracownika
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.map((emp) => (
          <div key={emp.id} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">{emp.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{emp.role || 'pracownik'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(emp.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {emp.shiftSchedule?.type === 'alternating' && (
              <div className="mb-3 space-y-1.5">
                {emp.shiftSchedule.shifts && emp.shiftSchedule.shifts.length > 0 ? (
                  emp.shiftSchedule.shifts.map((shift, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-1 rounded-full font-medium shrink-0 ${i === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        Zm. {String.fromCharCode(65 + i)}: {shift.start}–{shift.end}
                      </span>
                      {shift.days.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {shift.days.map(d => dayLabelsShort[d] || d).join(', ')}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                      Zm. A: {emp.shiftSchedule.shiftA?.start}–{emp.shiftSchedule.shiftA?.end}
                    </span>
                    <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-1 rounded-full font-medium">
                      Zm. B: {emp.shiftSchedule.shiftB?.start}–{emp.shiftSchedule.shiftB?.end}
                    </span>
                  </div>
                )}
              </div>
            )}
            {!emp.shiftSchedule && emp.workingHours && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Godziny pracy</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(emp.workingHours).map(([day, h]) => {
                    const label = dayLabelsShort[day] || day;
                    const display = typeof h === 'string' ? h : `${h.start}-${h.end}`;
                    return (
                      <span key={day} className="text-xs bg-secondary px-2 py-1 rounded">
                        {label}: {display}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {emp.daysOff && emp.daysOff.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Dni wolne: {emp.daysOff.length}
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {(emp as any).googleCalendarId ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Kalendarz przypisany
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                      onClick={async () => {
                        await updateDoc(doc(db, 'employees', emp.id), { googleCalendarId: null, googleCalendarName: null });
                        toast.success('Odłączono kalendarz');
                      }}>
                      Odłącz
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {(emp as any).googleCalendarName || (emp as any).googleCalendarId}
                  </p>
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5"
                    onClick={async () => {
                      if (!googleConnected) { toast.error('Najpierw połącz konto Google w Ustawieniach'); return; }
                      setCalPickerEmpId(emp.id);
                      setCalPickerLoading(true);
                      setCalList([]);
                      const cals = await listCalendars();
                      setCalList(cals);
                      setCalPickerLoading(false);
                    }}>
                    <ChevronDown className="w-3 h-3" /> Zmień kalendarz
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
                  disabled={!googleConnected}
                  onClick={async () => {
                    if (!googleConnected) { toast.error('Najpierw połącz konto Google w Ustawieniach'); return; }
                    setCalPickerEmpId(emp.id);
                    setCalPickerLoading(true);
                    setCalList([]);
                    const cals = await listCalendars();
                    setCalList(cals);
                    setCalPickerLoading(false);
                  }}>
                  <Calendar className="w-3.5 h-3.5" />
                  {googleConnected ? 'Przypisz kalendarz' : 'Brak połączenia Google (Ustawienia)'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak pracowników. Dodaj pierwszego pracownika.</p>
      )}

      <Dialog open={!!calPickerEmpId} onOpenChange={(o) => { if (!o) setCalPickerEmpId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Wybierz kalendarz
            </DialogTitle>
          </DialogHeader>
          {calPickerLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : calList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Brak dostępnych kalendarzy</p>
          ) : (
            <div className="space-y-2 py-2">
              {calList.map((cal) => (
                <button
                  key={cal.id}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-secondary/60 transition-colors text-sm"
                  onClick={async () => {
                    if (!calPickerEmpId) return;
                    await updateDoc(doc(db, 'employees', calPickerEmpId), {
                      googleCalendarId: cal.id,
                      googleCalendarName: cal.summary,
                    });
                    toast.success(`Kalendarz: ${cal.summary}`);
                    setCalPickerEmpId(null);
                  }}
                >
                  <span className="font-medium">{cal.summary}</span>
                  {cal.primary && <span className="ml-2 text-xs text-muted-foreground">(główny)</span>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edytuj pracownika' : 'Dodaj pracownika'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Imię</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Rola</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pracownik">Pracownik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Login</Label>
                <Input value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} />
              </div>
              <div>
                <Label>Hasło</Label>
                <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Telefon pracownika (do powiadomień SMS)</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+48 600 100 200"
              />
            </div>

            <div>
              <Label className="mb-2 block">Godziny pracy</Label>
              <div className="space-y-2">
                {DAYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm w-28 shrink-0">{label}</span>
                    <Input
                      value={form.workingHours[key] || ''}
                      onChange={e => setWH(key, e.target.value)}
                      placeholder="np. 6:00-22:00 lub wolne"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Dni wolne (daty oddzielone przecinkami, np. 2026-04-11, 2026-04-25)</Label>
              <Input
                value={form.daysOff}
                onChange={e => setForm(f => ({ ...f, daysOff: e.target.value }))}
                placeholder="2026-04-11, 2026-04-25"
              />
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={form.shiftMode}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, shiftMode: !!checked }))}
                />
                <div>
                  <p className="text-sm font-medium">Tryb zmianowy</p>
                  <p className="text-xs text-muted-foreground">Automatycznie zmienia godziny i dni pracy w cyklu tygodniowym</p>
                </div>
              </label>

              {form.shiftMode && (
                <div className="space-y-4 pl-7">
                  <div>
                    <Label className="text-xs mb-1.5 block">Liczba zmian</Label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleShiftCountChange(n)}
                          className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${form.shiftCount === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.shiftEntries.slice(0, form.shiftCount).map((entry, i) => (
                    <div key={i} className="rounded-md border border-border p-3 space-y-3">
                      <p className="text-sm font-medium">Zmiana {String.fromCharCode(65 + i)}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Od</Label>
                          <Input
                            type="time"
                            value={entry.start}
                            onChange={e => updateShiftEntry(i, 'start', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Do</Label>
                          <Input
                            type="time"
                            value={entry.end}
                            onChange={e => updateShiftEntry(i, 'end', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Dni tygodnia</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map(({ key }) => {
                            const checked = entry.days.includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleShiftDay(i, key)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                              >
                                {dayLabelsShort[key]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <Label className="text-xs">Data referencyjna zmiany A <span className="text-muted-foreground font-normal">(dowolna data)</span></Label>
                    <Input
                      type="date"
                      value={form.weekAStartDate}
                      onChange={e => setForm(f => ({ ...f, weekAStartDate: e.target.value }))}
                      className="text-sm mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Wpisz dowolną datę z tygodnia, w którym pracownik ma zmianę A</p>
                  </div>
                </div>
              )}
            </div>

            {form.role === 'pracownik' && (
              <div>
                <Label className="mb-2 block">Widoczność kalendarzy</Label>
                <p className="text-xs text-muted-foreground mb-2">Wybierz których pracowników kalendarze może przeglądać</p>
                <div className="space-y-2">
                  {employees.filter(e => e.id !== editing?.id).map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.canViewCalendars.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          setForm(f => ({
                            ...f,
                            canViewCalendars: checked
                              ? [...f.canViewCalendars, emp.id]
                              : f.canViewCalendars.filter(id => id !== emp.id)
                          }));
                        }}
                      />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground">
              {editing ? 'Zapisz' : 'Dodaj'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployees;
