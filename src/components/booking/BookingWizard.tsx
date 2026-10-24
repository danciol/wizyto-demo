import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepService } from './StepService';
import { StepEmployee } from './StepEmployee';
import { StepDateTime } from './StepDateTime';
import { StepClientForm } from './StepClientForm';
import { StepPayment } from './StepPayment';
import { StepConfirmation } from './StepConfirmation';
import { StepWaitingList } from './StepWaitingList';
import { Service, Employee } from '@/data/services';
import { useServices, useEmployees, useAppointments, useSettings } from '@/hooks/useFirestore';
import { X, Loader2 } from 'lucide-react';

export interface BookingData {
  service: Service | null;
  employee: Employee | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  depositOrderId?: string;
}

interface BookingWizardProps {
  onClose?: () => void;
  standalone?: boolean;
  initialServiceId?: string;
}

const stepLabels = ['Usługa', 'Pracownik', 'Termin', 'Dane', 'Płatność'];

export function BookingWizard({ onClose, standalone, initialServiceId }: BookingWizardProps) {
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { appointments, loading: loadingA } = useAppointments();
  const { depositAmount, loading: loadingSettings } = useSettings();

  const loading = loadingS || loadingE || loadingA || loadingSettings;

  const initialService = initialServiceId ? services.find(s => s.id === initialServiceId) ?? null : null;
  const [step, setStep] = useState(initialService ? 1 : 0);
  const [booking, setBooking] = useState<BookingData>({
    service: initialService,
    employee: null,
    date: null,
    time: null,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
  });
  const [waitingMode, setWaitingMode] = useState(false);
  const [waitingDate, setWaitingDate] = useState<Date | null>(null);

  const update = (data: Partial<BookingData>) => setBooking(prev => ({ ...prev, ...data }));

  const handleReset = () => {
    setStep(0);
    setBooking({ service: null, employee: null, date: null, time: null, clientName: '', clientPhone: '', clientEmail: '' });
    setWaitingMode(false);
    setWaitingDate(null);
  };

  const availableEmployees = booking.service
    ? employees.filter(e => (booking.service!.employees || booking.service!.employeeIds || []).includes(e.id))
    : [];

  const requiresDeposit = depositAmount > 0;

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const visibleSteps = requiresDeposit ? stepLabels : stepLabels.filter(l => l !== 'Płatność');
  const showProgressBar = !waitingMode && step < (requiresDeposit ? 5 : 4);

  const content = (
    <>
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {waitingMode ? 'Lista oczekujących' : 'Rezerwacja wizyty'}
        </h2>
        {!standalone && onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {showProgressBar && (
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1">
            {visibleSteps.map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
                <p className={`text-[10px] mt-1 text-center transition-colors ${i <= step ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : waitingMode && waitingDate ? (
          <StepWaitingList
            service={booking.service}
            employee={booking.employee}
            date={waitingDate}
            onBack={() => { setWaitingMode(false); setWaitingDate(null); }}
            onClose={standalone ? handleReset : (onClose ?? (() => {}))}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <StepService
                  services={services.filter(s => s.active !== false && s.selfBooking !== false)}
                  selected={booking.service}
                  onSelect={(s) => { update({ service: s, employee: null, date: null, time: null }); setStep(1); }}
                />
              )}
              {step === 1 && (
                <StepEmployee
                  employees={availableEmployees}
                  selected={booking.employee}
                  onSelect={(e) => { update({ employee: e, date: null, time: null }); setStep(2); }}
                  onBack={() => setStep(0)}
                />
              )}
              {step === 2 && booking.service && booking.employee && (
                <StepDateTime
                  employee={booking.employee}
                  serviceDuration={booking.service.duration}
                  appointments={appointments}
                  selectedDate={booking.date}
                  selectedTime={booking.time}
                  onSelect={(date, time) => { update({ date, time }); setStep(3); }}
                  onBack={() => setStep(1)}
                  onWaitingList={(date) => { setWaitingDate(date); setWaitingMode(true); }}
                />
              )}
              {step === 3 && (
                <StepClientForm
                  booking={booking}
                  onSubmit={(data) => {
                    update(data);
                    setStep(requiresDeposit ? 4 : 5);
                  }}
                  onBack={() => setStep(2)}
                />
              )}
              {step === 4 && requiresDeposit && (
                <StepPayment
                  booking={booking}
                  depositAmount={depositAmount}
                  onPaymentSuccess={(orderId) => {
                    update({ depositOrderId: orderId });
                    setStep(5);
                  }}
                  onBack={() => setStep(3)}
                />
              )}
              {step === 5 && (
                <StepConfirmation
                  booking={booking}
                  onClose={standalone ? handleReset : (onClose ?? (() => {}))}
                  closeLabel={standalone ? 'Nowa rezerwacja' : undefined}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );

  if (standalone) {
    return (
      <div className="min-h-screen bg-background flex items-start justify-center pt-6 p-4">
        <div className="bg-card rounded-2xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col z-10">
        {content}
      </div>
    </div>
  );
}
