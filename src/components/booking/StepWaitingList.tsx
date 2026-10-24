import { useState } from 'react';
import { Clock, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { Service, Employee } from '@/data/services';

interface Props {
  service: Service | null;
  employee: Employee | null;
  date: Date;
  onBack: () => void;
  onClose: () => void;
}

export function StepWaitingList({ service, employee, date, onBack, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'waiting_list'), {
        serviceId: service?.id ?? '',
        serviceName: service?.name ?? '',
        employeeId: employee?.id ?? '',
        employeeName: employee?.name ?? '',
        preferredDate: date.toISOString().split('T')[0],
        clientName: name.trim(),
        clientPhone: phone.trim(),
        createdAt: new Date().toISOString(),
        notified: false,
      });
      setSaved(true);
    } catch {
      toast.error('Błąd zapisu. Spróbuj ponownie.');
    }
    setSaving(false);
  };

  if (saved) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-heading text-lg font-semibold mb-2">Zapisano!</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Gdy zwolni się termin skontaktujemy się z Tobą.
        </p>
        <Button onClick={onClose} className="w-full bg-primary text-primary-foreground">
          Zamknij
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={16} /> Wróć do kalendarza
      </button>

      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-heading text-lg font-semibold">Lista oczekujących</h3>
        <p className="text-sm text-muted-foreground mt-1">Powiadomimy Cię SMS gdy zwolni się miejsce</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-4 text-sm space-y-1.5">
        <p><span className="text-muted-foreground">Usługa:</span> <strong>{service?.name}</strong></p>
        <p><span className="text-muted-foreground">Pracownik:</span> <strong>{employee?.name}</strong></p>
        <p><span className="text-muted-foreground">Preferowana data:</span> <strong>{format(date, 'd MMMM yyyy', { locale: pl })}</strong></p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Imię i nazwisko</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Anna Kowalska" />
        </div>
        <div className="space-y-1.5">
          <Label>Numer telefonu</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 000 000 000" type="tel" />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={saving || !name.trim() || !phone.trim()}
        className="w-full bg-primary text-primary-foreground font-semibold"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Zapisuję...</> : 'Zapisz się na listę'}
      </Button>
    </div>
  );
}
