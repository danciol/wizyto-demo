import { BookingWizard } from '@/components/booking/BookingWizard';
import { usePlan } from '@/hooks/usePlan';
import { useSubscription } from '@/hooks/useSubscription';
import { salonConfig } from '@/config/salon';
import { Phone, Loader2 } from 'lucide-react';

export default function BookingWidget() {
  const { status } = useSubscription();
  const { can } = usePlan();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'inactive' || status === 'expired' || !can('online_booking')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-xs">
          <p className="font-heading text-xl font-bold mb-2">{salonConfig.name}</p>
          <p className="text-sm text-muted-foreground mb-6">Rezerwacja online jest obecnie niedostępna.</p>
          {salonConfig.phone && (
            <a
              href={`tel:${salonConfig.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Phone className="w-4 h-4" /> {salonConfig.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return <BookingWizard standalone />;
}
