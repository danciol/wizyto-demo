import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Appointment, Service, Employee } from '@/data/services';

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
}

const AppointmentDialog = ({
  open, onOpenChange, appointment, defaultDate, services, employees, onSave, onDelete, hidePhone,
}: AppointmentDialogProps) => {
  const isEdit = !!appointment;

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<Appointment['status']>('pending');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (appointment) {
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
  }, [appointment, defaultDate]);

  const selectedService = services.find(s => s.id === serviceId);

  const handleSave = () => {
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
    if (notes) data.notes = notes;
    if (appointment?.googleCalendarEventId) data.googleCalendarEventId = appointment.googleCalendarEventId;

    onSave(data);
    onOpenChange(false);
  };

  // Check both employeeIds and employees fields on service, plus employee.services
  const availableServices = employeeId
    ? services.filter(s => s.active !== false && (
        s.employeeIds?.includes(employeeId) ||
        s.employees?.includes(employeeId) ||
        employees.find(e => e.id === employeeId)?.services?.includes(s.id)
      ))
    : services.filter(s => s.active !== false);

  const matchedEmployees = serviceId
    ? employees.filter((employee) =>
        employee.services?.includes(serviceId) ||
        selectedService?.employeeIds?.includes(employee.id) ||
        selectedService?.employees?.includes(employee.id)
      )
    : employees;

  const availableEmployees = matchedEmployees.length > 0 ? matchedEmployees : employees;

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
              <Input id="appt-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-time">Godzina</Label>
              <Input id="appt-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Pracownik</Label>
            <NativeSelect value={employeeId} onChange={(e) => {
              setEmployeeId(e.target.value);
              setServiceId('');
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
            <Label htmlFor="appt-client">Klient</Label>
            <Input id="appt-client" placeholder="Imię i nazwisko" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-phone">Telefon</Label>
              {hidePhone && isEdit ? (
                <div className="flex items-center h-10 px-3 rounded-md border border-border bg-secondary/50 text-sm text-muted-foreground tracking-widest">
                  ••• ••• •••
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
              <Input type="number" min={15} step={15} value={duration} onChange={e => setDuration(Number(e.target.value))} />
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;