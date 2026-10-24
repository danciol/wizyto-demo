import { useSubscription } from '@/hooks/useSubscription';
import { salonConfig } from '@/config/salon';
import { Phone } from 'lucide-react';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { status } = useSubscription();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'inactive' || status === 'expired') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <p className="font-heading text-2xl font-bold text-foreground mb-1">{salonConfig.name}</p>
          <p className="text-sm text-muted-foreground mb-10">{salonConfig.city}</p>

          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
            <svg className="w-7 h-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-3">
            Strona tymczasowo niedostępna
          </h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Przepraszamy za utrudnienia. W razie pytań dotyczących wizyt prosimy o kontakt telefoniczny.
          </p>

          {salonConfig.phone && (
            <a
              href={`tel:${salonConfig.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {salonConfig.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
