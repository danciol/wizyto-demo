import { useSubscription } from '@/hooks/useSubscription';
import { salonConfig } from '@/config/salon';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const status = useSubscription();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'inactive' || status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            {status === 'expired' ? 'Subskrypcja wygasła' : 'Konto nieaktywne'}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {status === 'expired'
              ? 'Okres subskrypcji zakończył się. Skontaktuj się z administratorem systemu, aby przedłużyć dostęp.'
              : 'Konto zostało tymczasowo wyłączone. Skontaktuj się z administratorem systemu.'
            }
          </p>
          <div className="p-4 rounded-xl bg-secondary/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Kontakt z administratorem:</p>
            <p>📧 kontakt@salonos.pl</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
