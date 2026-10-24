import { useState } from 'react';
import type { Employee } from '@/data/services';
import { useEmployees } from '@/hooks/useFirestore';
import { Edit2, Trash2, User, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  phone: string;
  password: string;
  role: string;
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

const AdminEmployees = () => {
  const { employees, loading, updateEmployee, deleteEmployee } = useEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteStep1Id, setDeleteStep1Id] = useState<string | null>(null);
  const [deleteStep2Id, setDeleteStep2Id] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>({
    name: '', phone: '', password: '', role: 'pracownik',
    workingHours: {}, daysOff: '', canViewCalendars: [],
    shiftMode: false, shiftCount: 2,
    shiftEntries: [
      { start: '08:00', end: '16:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
      { start: '12:00', end: '20:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    ],
    weekAStartDate: '',
  });

  const openEdit = (e: Employee) => {
    setEditing(e);
    const wh: Record<string, string> = {};
    for (const [day, val] of Object.entries(e.workingHours)) {
      wh[day] = typeof val === 'string' ? val : `${val.start}-${val.end}`;
    }
    const ss = e.shiftSchedule;
    let shiftCount = 2;
    let shiftEntries: ShiftEntry[] = [
      { start: '08:00', end: '16:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
      { start: '12:00', end: '20:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    ];
    if (ss?.type === 'alternating') {
      if (ss.shifts && ss.shifts.length > 0) {
        shiftCount = ss.shifts.length;
        shiftEntries = ss.shifts.map(s => ({ ...s }));
      } else {
        // legacy shiftA/shiftB — migrate to new format, using workingHours keys as days
        const activeDays = Object.keys(wh);
        shiftEntries = [
          { start: ss.shiftA?.start ?? '08:00', end: ss.shiftA?.end ?? '16:00', days: activeDays },
          { start: ss.shiftB?.start ?? '12:00', end: ss.shiftB?.end ?? '20:00', days: activeDays },
        ];
      }
    }
    setForm({
      name: e.name,
      phone: e.phone || '',
      password: '',
      role: e.role || 'pracownik',
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
    if (!editing) return;
    if (!form.name.trim()) { toast.error('Wprowadź imię'); return; }

    setSaving(true);
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
      const data: Partial<Employee> = {
        name: form.name,
        role: form.role as Employee['role'],
        workingHours: form.workingHours,
        daysOff,
        canViewCalendars: form.canViewCalendars,
        shiftSchedule,
      };
      if (form.phone.trim()) data.phone = form.phone.trim();

      if (form.password.trim()) {
        if (form.password.length < 6) { toast.error('Hasło musi mieć minimum 6 znaków'); setSaving(false); return; }
        data.password = form.password;
      }

      await updateEmployee(editing.id, data);
      toast.success('Pracownik zaktualizowany');
      setDialogOpen(false);
    } catch {
      toast.error('Błąd zapisu');
    } finally {
      setSaving(false);
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
      <h1 className="font-heading text-2xl font-bold">Pracownicy</h1>

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
                  {emp.login && <p className="text-xs text-muted-foreground font-mono">@{emp.login}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteStep1Id(emp.id)}>
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
              <p className="text-xs text-muted-foreground">Dni wolne: {emp.daysOff.length}</p>
            )}
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak pracowników.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edytuj pracownika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Imię i nazwisko</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Rola</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pracownik">Pracownik</SelectItem>
                  <SelectItem value="salon">Salon (recepcja)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Login</Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-border bg-secondary/50 text-sm font-mono text-muted-foreground">
                  {editing?.login || '—'}
                </div>
              </div>
              <div>
                <Label>Nowe hasło <span className="text-muted-foreground font-normal">(opcjonalne)</span></Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Zostaw puste — bez zmian"
                />
              </div>
            </div>
            <div>
              <Label>Telefon pracownika <span className="text-muted-foreground font-normal">(do powiadomień SMS)</span></Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+48 600 100 200"
              />
            </div>

            {form.role !== 'salon' && (
              <>
                <div>
                  <Label className="mb-2 block">Godziny pracy</Label>
                  <div className="space-y-2">
                    {DAYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm w-28 shrink-0">{label}</span>
                        <Input
                          value={form.workingHours[key] || ''}
                          onChange={e => setWH(key, e.target.value)}
                          placeholder="np. 9:00-17:00 lub wolne"
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
              </>
            )}

            {form.role === 'pracownik' && (
              <div>
                <Label className="mb-2 block">Widoczność kalendarzy</Label>
                <p className="text-xs text-muted-foreground mb-2">Wybierz których pracowników kalendarze może przeglądać</p>
                <div className="space-y-2">
                  {employees.filter(e => e.id !== editing?.id && (e.role || 'pracownik') !== 'salon').map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.canViewCalendars.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          setForm(f => ({
                            ...f,
                            canViewCalendars: checked
                              ? [...f.canViewCalendars, emp.id]
                              : f.canViewCalendars.filter(id => id !== emp.id),
                          }));
                        }}
                      />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Zapisuję...</> : 'Zapisz'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Potwierdzenie 1 */}
      <AlertDialog open={!!deleteStep1Id} onOpenChange={open => { if (!open) setDeleteStep1Id(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć pracownika?</AlertDialogTitle>
            <AlertDialogDescription>
              Zamierzasz usunąć <span className="font-semibold text-foreground">{employees.find(e => e.id === deleteStep1Id)?.name}</span>.
              Operacja usunie konto i wszystkie dane pracownika.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setDeleteStep2Id(deleteStep1Id); setDeleteStep1Id(null); }}
            >
              Tak, kontynuuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Potwierdzenie 2 */}
      <AlertDialog open={!!deleteStep2Id} onOpenChange={open => { if (!open) setDeleteStep2Id(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ostateczne potwierdzenie</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji <span className="font-semibold text-destructive">nie można cofnąć</span>.
              Pracownik <span className="font-semibold text-foreground">{employees.find(e => e.id === deleteStep2Id)?.name}</span> zostanie trwale usunięty wraz z kontem logowania.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { handleDelete(deleteStep2Id!); setDeleteStep2Id(null); }}
            >
              Usuń na zawsze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEmployees;
