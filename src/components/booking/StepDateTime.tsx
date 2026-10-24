import { useState, useMemo } from 'react';
import { format, addDays, startOfDay, isSameDay, setHours, setMinutes, isAfter } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight as ChevronRightIcon, Clock } from 'lucide-react';
import { Employee, Appointment } from '@/data/services';
import { Button } from '@/components/ui/button';

interface Props {
  employee: Employee;
  serviceDuration: number;
  appointments: Appointment[];
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelect: (date: Date, time: string) => void;
  onBack: () => void;
  onWaitingList?: (date: Date) => void;
}

const dayKeys: Record<number, string[]> = {
  1: ['mon', 'monday'],
  2: ['tue', 'tuesday'],
  3: ['wed', 'wednesday'],
  4: ['thu', 'thursday'],
  5: ['fri', 'friday'],
  6: ['sat', 'saturday'],
  0: ['sun', 'sunday'],
};

function getDayHours(workingHours: Employee['workingHours'], dayOfWeek: number) {
  const keys = dayKeys[dayOfWeek];
  for (const key of keys) {
    if (workingHours[key]) return workingHours[key];
  }
  return undefined;
}

function generateSlots(employee: Employee, date: Date, duration: number, appointments: Appointment[]): string[] {
  const dayStr = format(date, 'yyyy-MM-dd');
  if ((employee.daysOff || []).includes(dayStr)) return [];

  const hours = getDayHours(employee.workingHours, date.getDay());
  if (!hours) return [];

  let startStr: string, endStr: string;
  if (typeof hours === 'string') {
    if (hours === 'wolne') return [];
    const parts = hours.split('-');
    startStr = parts[0];
    endStr = parts[1];
  } else {
    startStr = hours.start;
    endStr = hours.end;
  }

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  const dayAppts = appointments.filter(a => {
    const aDate = new Date(a.date);
    return a.employeeId === employee.id && isSameDay(aDate, date) && a.status !== 'cancelled';
  });

  const slots: string[] = [];
  for (let m = startMin; m + duration <= endMin; m += 30) {
    const slotStart = setMinutes(setHours(startOfDay(date), Math.floor(m / 60)), m % 60);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    if (!isAfter(slotStart, new Date()) && isSameDay(date, new Date())) continue;

    const conflict = dayAppts.some(a => {
      const aStart = new Date(a.date);
      const aEnd = new Date(aStart.getTime() + a.duration * 60000);
      return slotStart < aEnd && slotEnd > aStart;
    });

    if (!conflict) {
      slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function StepDateTime({ employee, serviceDuration, appointments, selectedDate, selectedTime, onSelect, onBack, onWaitingList }: Props) {
  const today = startOfDay(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickedDate, setPickedDate] = useState<Date | null>(selectedDate);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i));
  }, [weekOffset]);

  const slots = useMemo(() => {
    if (!pickedDate) return [];
    return generateSlots(employee, pickedDate, serviceDuration, appointments);
  }, [pickedDate, employee, serviceDuration, appointments]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft size={16} /> Zmień pracownika
      </button>
      <p className="text-muted-foreground text-sm mb-4">Wybierz datę i godzinę</p>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(days[0], 'd MMM', { locale: pl })} — {format(days[6], 'd MMM yyyy', { locale: pl })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 3}>
          <ChevronRightIcon size={16} />
        </Button>
      </div>

      {/* Day pills */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map(day => {
          const dayHours = getDayHours(employee.workingHours, day.getDay());
          const hasHours = !!dayHours && dayHours !== 'wolne';
          const isPast = day < today;
          const isSelected = pickedDate && isSameDay(day, pickedDate);
          const disabled = !hasHours || isPast;

          return (
            <button
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => setPickedDate(day)}
              className={`flex flex-col items-center py-2 rounded-lg text-xs transition-all ${
                disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary text-foreground'
              }`}
            >
              <span className="font-medium">{format(day, 'EEE', { locale: pl })}</span>
              <span className="text-lg font-semibold">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {pickedDate && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Dostępne godziny — {format(pickedDate, 'EEEE, d MMMM', { locale: pl })}
          </p>
          {slots.length > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-2 max-h-[30vh] overflow-y-auto">
                {slots.map(time => (
                  <button
                    key={time}
                    onClick={() => onSelect(pickedDate, time)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      selectedTime === time
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5 text-foreground'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              {onWaitingList && (
                <div className="mt-4 pt-4 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground mb-2">Żaden termin Ci nie odpowiada?</p>
                  <Button variant="ghost" size="sm" onClick={() => onWaitingList(pickedDate)} className="gap-2 text-muted-foreground hover:text-foreground">
                    <Clock size={14} />
                    Zapisz się na listę oczekujących
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground text-sm">Brak dostępnych terminów w tym dniu</p>
              {onWaitingList && (
                <Button variant="outline" size="sm" onClick={() => onWaitingList(pickedDate)} className="gap-2">
                  <Clock size={14} />
                  Zapisz się na listę oczekujących
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
