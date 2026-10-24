import { useState } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarOff, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useEmployees } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AdminDaysOff = () => {
  const { employees, loading, updateEmployee } = useEmployees();
  const { employee: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const visibleEmployees = employees.filter(e => (e.role || 'pracownik') !== 'salon');

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saving, setSaving] = useState(false);

  const empId = isAdmin ? selectedEmpId || visibleEmployees[0]?.id || '' : currentUser?.id || '';
  const emp = employees.find(e => e.id === empId);

  const handleAdd = async () => {
    if (!dateFrom || !emp) return;
    const endDate = dateTo || dateFrom;
    if (dateTo && dateTo < dateFrom) {
      toast.error('Data "do" musi być późniejsza niż "od"');
      return;
    }
    setSaving(true);
    try {
      const days = eachDayOfInterval({
        start: new Date(dateFrom + 'T12:00:00'),
        end: new Date(endDate + 'T12:00:00'),
      }).map(d => format(d, 'yyyy-MM-dd'));

      const current = emp.daysOff || [];
      const toAdd = days.filter(d => !current.includes(d));
      if (toAdd.length > 0) {
        await updateEmployee(emp.id, { daysOff: [...current, ...toAdd].sort() });
        toast.success(toAdd.length === 1 ? 'Dzień wolny dodany' : `Dodano ${toAdd.length} dni wolnych`);
      }
      setDateFrom('');
      setDateTo('');
    } catch { toast.error('Błąd zapisu'); }
    setSaving(false);
  };

  const handleRemove = async (dateStr: string) => {
    if (!emp) return;
    try {
      await updateEmployee(emp.id, { daysOff: (emp.daysOff || []).filter(d => d !== dateStr) });
      toast.success('Dzień wolny usunięty');
    } catch { toast.error('Błąd zapisu'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const sortedDaysOff = [...(emp?.daysOff || [])].sort().reverse();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <CalendarOff className="w-6 h-6 text-primary" />
          Dni wolne
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Zaplanuj nieobecności — w tych dniach rezerwacje będą zablokowane</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        {isAdmin && visibleEmployees.length > 1 && (
          <div className="space-y-1.5">
            <Label>Pracownik</Label>
            <NativeSelect
              value={selectedEmpId || visibleEmployees[0]?.id || ''}
              onChange={e => setSelectedEmpId(e.target.value)}
              className="w-full"
            >
              {visibleEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </NativeSelect>
          </div>
        )}

        {!isAdmin && (
          <p className="text-sm font-medium">{emp?.name}</p>
        )}

        <div className="space-y-2">
          <Label>Dodaj dni wolne</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Od</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Do <span className="text-muted-foreground/60">(opcjonalnie)</span></span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                min={dateFrom || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!dateFrom || saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Dodaj
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Zaplanowane dni wolne</Label>
          {sortedDaysOff.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Brak zaplanowanych dni wolnych</p>
          ) : (
            <div className="space-y-1">
              {sortedDaysOff.map(dateStr => (
                <div key={dateStr} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50 text-sm">
                  <span className="font-medium capitalize">
                    {format(new Date(dateStr + 'T12:00:00'), 'EEEE, d MMMM yyyy', { locale: pl })}
                  </span>
                  <button
                    onClick={() => handleRemove(dateStr)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-3"
                    title="Usuń"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDaysOff;
