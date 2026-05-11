import { useState } from 'react';
import { useTimeBlocks, useEmployees } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const AdminTimeBlocks = () => {
  const { timeBlocks, loading: loadingTB, addTimeBlock, deleteTimeBlock } = useTimeBlocks();
  const { employees, loading: loadingE } = useEmployees();
  const { employee: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [empId, setEmpId] = useState<string>(isAdmin ? '' : (currentUser?.id || ''));
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const staffEmployees = employees.filter(e => (e.role || 'pracownik') !== 'salon');

  const handleAdd = async () => {
    const resolvedEmpId = isAdmin ? empId : (currentUser?.id || '');
    if (!resolvedEmpId || !date || !startTime || !endTime) {
      toast.error('Uzupełnij wszystkie pola');
      return;
    }
    if (startTime >= endTime) {
      toast.error('Godzina końcowa musi być późniejsza niż startowa');
      return;
    }
    setSaving(true);
    try {
      await addTimeBlock({ employeeId: resolvedEmpId, date, startTime, endTime, note: note.trim() || undefined });
      toast.success('Blokada dodana');
      setDate('');
      setStartTime('');
      setEndTime('');
      setNote('');
    } catch {
      toast.error('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTimeBlock(id);
      toast.success('Blokada usunięta');
    } catch {
      toast.error('Błąd usuwania');
    }
  };

  const loading = loadingTB || loadingE;

  const visibleBlocks = isAdmin
    ? timeBlocks
    : timeBlocks.filter(b => b.employeeId === currentUser?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Ban className="w-6 h-6 text-primary" />
        Blokady terminów
      </h1>

      {/* Add form */}
      <div className="glass-card p-5 space-y-4">
        <p className="text-sm font-medium">Dodaj blokadę</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isAdmin && (
            <div className="space-y-1">
              <Label>Pracownik</Label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                <SelectContent>
                  {staffEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Od</Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Do</Label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Powód <span className="text-muted-foreground font-normal">(opcjonalnie)</span></Label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="np. spotkanie, przerwa, szkolenie" />
        </div>
        <Button onClick={handleAdd} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Dodaj blokadę
        </Button>
      </div>

      {/* List */}
      {visibleBlocks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Brak blokad terminów.</p>
      ) : (
        <div className="space-y-2">
          {visibleBlocks.map(block => {
            const emp = employees.find(e => e.id === block.employeeId);
            let dateLabel = block.date;
            try {
              dateLabel = format(new Date(block.date), 'd MMMM yyyy (EEEE)', { locale: pl });
            } catch { /* keep raw */ }
            return (
              <div key={block.id} className="glass-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{dateLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {block.startTime} – {block.endTime}
                    {emp && <span className="ml-2">· {emp.name}</span>}
                    {block.note && <span className="ml-2">· {block.note}</span>}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive shrink-0"
                  onClick={() => handleDelete(block.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTimeBlocks;
