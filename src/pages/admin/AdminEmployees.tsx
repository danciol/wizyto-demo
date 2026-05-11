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

interface EmployeeForm {
  name: string;
  role: string;
  login: string;
  password: string;
  phone: string;
  workingHours: Record<string, string>;
  daysOff: string;
  canViewCalendars: string[];
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
  const [form, setForm] = useState<EmployeeForm>({
    name: '', role: 'pracownik', login: '', password: '', phone: '',
    workingHours: { ...defaultWorkingHours }, daysOff: '', canViewCalendars: [],
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', role: 'pracownik', login: '', password: '', phone: '',
      workingHours: { ...defaultWorkingHours }, daysOff: '', canViewCalendars: [],
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
    setForm({
      name: e.name,
      role: e.role || 'pracownik',
      login: e.login || '',
      password: e.password || '',
      phone: e.phone || '',
      workingHours: wh,
      daysOff: (e.daysOff || []).join(', '),
      canViewCalendars: e.canViewCalendars || [],
    });
    setDialogOpen(true);
  };

  const setWH = (day: string, value: string) => {
    setForm(f => ({ ...f, workingHours: { ...f.workingHours, [day]: value } }));
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Wprowadź imię'); return; }
    try {
      const daysOff = form.daysOff.split(',').map(s => s.trim()).filter(Boolean);
      const data: Record<string, unknown> = {
        name: form.name,
        role: form.role,
        login: form.login,
        password: form.password,
        phone: form.phone.trim() || undefined,
        workingHours: form.workingHours,
        daysOff,
        canViewCalendars: form.canViewCalendars,
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

            {emp.workingHours && (
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
