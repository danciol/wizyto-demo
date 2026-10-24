import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Trash2, AlertTriangle, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Appointment, Service, Employee, getEffectiveHours } from '@/data/services';
import { useClients } from '@/hooks/useFirestore';

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date | null;
  services: Service[];
  employees: Employee[];
  onSave: (data: Appointment) => void;
  onDelete?: (id: string) => void;
  hidePhone?: boolean;
  onRevealPhone?: (clientName: string, clientPhone: string) => void;
}

const AppointmentDialog = ({
  open, onOpenChange, appointment, defaultDate, services, employees, onSave, onDelete, hidePhone, onRevealPhone,
}: AppointmentDialogProps) => {
  const isEdit = !!appointment;
  const { clients } = useClients();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<Appointment['status']>('pending');
  const [notes, setNotes] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<Appointment | null>(null);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clientSuggestions = clientSearch.trim().length >= 1
    ? clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)
      ).slice(0, 6)
    : [];

  const selectClient = (c: { id: string; name: string; phone: string; email: string }) => {
    setClientId(c.id);
    setClientName(c.name);
    setClientPhone(formatPhoneNumber(c.phone));
    setClientEmail(c.email);
    setClientSearch('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (appointment) {
      setClientId(appointment.clientId || '');
      setClientName(appointment.clientName);
      setClientPhone(formatPhoneNumber(appointment.clientPhone));
      setClientEmail(appointment.clientEmail);
      setServiceId(appointment.serviceId);
      setEmployeeId(appointment.employeeId);
      const d = new Date(appointment.date);
      setDate(format(d, 'yyyy-MM-dd'));
      setTime(format(d, 'HH:mm'));
      setDuration(appointment.duration);
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
    } else if (defaultDate) {
      setClientId('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setServiceId('');
      setEmployeeId('');
      setDate(format(defaultDate, 'yyyy-MM-dd'));
      setTime(format(defaultDate, 'HH:mm'));
      setDuration(60);
      setStatus('pending');
      setNotes('');
    }
    setWarning(null);
    setPendingData(null);
    setPhoneRevealed(false);
  }, [appointment, defaultDate]);

  const clearWarning = () => { setWarning(null); setPendingData(null); };

  const selectedService = services.find(s => s.id === serviceId);

  const buildAppointmentData = (): Appointment => {
    const dateTime = new Date(`${date}T${time}`);
    const resolvedPhone = (hidePhone && isEdit)
      ? (appointment?.clientPhone || '')
      : clientPhone.replace(/-/g, '').replace(/\s/g, '');
    const data: Appointment = {
      id: appointment?.id || 'new-' + Date.now(),
      serviceId,
      employeeId,
      clientName: clientName || 'Nowa wizyta',
      clientPhone: resolvedPhone,
      clientEmail,
      date: dateTime.toISOString(),
      duration: selectedService?.duration || duration,
      status,
      createdAt: appointment?.createdAt || new Date().toISOString(),
    };
    const resolvedClientId = clientId || appointment?.clientId;
    if (resolvedClientId) data.clientId = resolvedClientId;
    if (notes) data.notes = notes;
    return data;
  };

  const checkOutsideHours = (data: Appointment): string | null => {
    if (!employeeId || !date || !time) return null;
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return null;
    const apptDate = new Date(`${date}T${time}`);
    const wh = getEffectiveHours(emp, apptDate);
    const apptMinutes = apptDate.getHours() * 60 + apptDate.getMinutes();
    const apptDuration = selectedService?.duration || duration;
    const endMinutes = apptMinutes + apptDuration;

    if (!wh) {
      return `${emp.name} ma w tym dniu wolne. Czy na pewno chcesz dodać wizytę?`;
    }
    const [startH, startM] = wh.start.split(':').map(Number);
    const [endH, endM] = wh.end.split(':').map(Number);
    const whStart = startH * 60 + startM;
    const whEnd = endH * 60 + endM;
    if (apptMinutes < whStart || endMinutes > whEnd) {
      return `${emp.name} pracuje w tym dniu od ${wh.start} do ${wh.end}. Czy na pewno chcesz dodać wizytę poza godzinami pracy?`;
    }
    return null;
  };

  const handleSave = () => {
    const data = buildAppointmentData();
    const msg = checkOutsideHours(data);
    if (msg) {
      setWarning(msg);
      setPendingData(data);
      return;
    }
    onSave(data);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (pendingData) {
      onSave(pendingData);
      onOpenChange(false);
    }
  };

  const availableServices = employeeId
    ? services.filter(s => s.active !== false && (
        s.employeeIds?.includes(employeeId) ||
        s.employees?.includes(employeeId) ||
        employees.find(e => e.id === employeeId)?.services?.includes(s.id)
      ))
    : services.filter(s => s.active !== false);

  const bookableEmployees = employees.filter(e => (e.role || 'pracownik') !== 'salon');

  const matchedEmployees = serviceId
    ? bookableEmployees.filter((employee) =>
        employee.services?.includes(serviceId) ||
        selectedService?.employeeIds?.includes(employee.id) ||
        selectedService?.employees?.includes(employee.id)
      )
    : bookableEmployees;

  const availableEmployees = matchedEmployees.length > 0 ? matchedEmployees : bookableEmployees;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ zIndex: 50 }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj wizytę' : 'Nowa wizyta'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-date">Data</Label>
              <Input id="appt-date" type="date" value={date} onChange={e => { setDate(e.target.value); clearWarning(); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-time">Godzina</Label>
              <Input id="appt-time" type="time" value={time} onChange={e => { setTime(e.target.value); clearWarning(); }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Pracownik</Label>
            <NativeSelect value={employeeId} onChange={(e) => {
              setEmployeeId(e.target.value);
              setServiceId('');
              clearWarning();
            }}>
              <option value="">Wybierz pracownika</option>
              {availableEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label>Usługa</Label>
            <NativeSelect
              value={serviceId}
              onChange={(e) => {
                const value = e.target.value;
                setServiceId(value);
                const svc = services.find(s => s.id === value);
                if (svc) setDuration(svc.duration);
                clearWarning();
              }}
            >
              <option value="">
                {employeeId && availableServices.length === 0 ? 'Brak usług dla wybranego pracownika' : 'Wybierz usługę'}
              </option>
              {availableServices.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration} min · {s.price} zł)
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label>Klient</Label>
            <div ref={searchRef} className="relative">
              <div className="relative">
                <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Szukaj w bazie klientów..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 text-sm"
                />
              </div>
              {showSuggestions && clientSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                  {clientSuggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
                      onMouseDown={e => { e.preventDefault(); selectClient(c); }}
                    >
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhoneNumber(c.phone)}{c.email ? ` · ${c.email}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input id="appt-client" placeholder="Imię i nazwisko" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-phone">Telefon</Label>
              {hidePhone && isEdit && !phoneRevealed ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center h-10 px-3 rounded-md border border-border bg-secondary/50 text-sm text-muted-foreground tracking-widest flex-1">
                    ••• ••• •••
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10 shrink-0 text-xs"
                    onClick={() => {
                      setPhoneRevealed(true);
                      onRevealPhone?.(appointment?.clientName || '', appointment?.clientPhone || '');
                    }}
                  >
                    Pokaż nr
                  </Button>
                </div>
              ) : hidePhone && isEdit && phoneRevealed ? (
                <div className="flex items-center h-10 px-3 rounded-md border border-border bg-secondary/50 text-sm font-medium">
                  {formatPhoneNumber(appointment?.clientPhone || '')}
                </div>
              ) : (
                <Input
                  id="appt-phone"
                  placeholder="xxx-xxx-xxx"
                  value={clientPhone}
                  onChange={e => setClientPhone(formatPhoneNumber(e.target.value))}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-email">Email</Label>
              <Input id="appt-email" type="email" placeholder="email@..." value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Czas trwania (min)</Label>
              <Input type="number" min={15} step={15} value={duration} onChange={e => { setDuration(Number(e.target.value)); clearWarning(); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as Appointment['status'])}>
                <option value="pending">Oczekuje</option>
                <option value="confirmed">Potwierdzona</option>
                <option value="completed">Zakończona</option>
                <option value="cancelled">Anulowana</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appt-notes">Notatki</Label>
            <Textarea id="appt-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {warning && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 space-y-2.5">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {warning}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={clearWarning}>
                  Zmień godzinę
                </Button>
                <Button size="sm" className="flex-1" onClick={handleConfirm}>
                  Zapisz mimo to
                </Button>
              </div>
            </div>
          )}

          {!warning && (
            <div className="flex gap-2 justify-between pt-2">
              {isEdit && onDelete ? (
                <Button variant="destructive" size="sm" onClick={() => { onDelete(appointment!.id); onOpenChange(false); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Usuń
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
                <Button onClick={handleSave}>Zapisz</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
