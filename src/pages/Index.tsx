import { useState } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { GallerySection } from '@/components/landing/GallerySection';
import { ContactSection } from '@/components/landing/ContactSection';
import { Footer } from '@/components/landing/Footer';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { usePlan } from '@/hooks/usePlan';

const Index = () => {
  const { can } = usePlan();
  const canBook = can('online_booking');

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>();

  const openBooking = (serviceId?: string) => {
    setBookingServiceId(serviceId);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar onBooking={canBook ? () => openBooking() : undefined} />
      <HeroSection onBooking={canBook ? () => openBooking() : undefined} />
      <AboutSection />
      <ServicesSection onBookService={canBook ? (id) => openBooking(id) : undefined} />
      <GallerySection />
      <ContactSection />
      <Footer />

      {canBook && bookingOpen && (
        <BookingWizard
          onClose={() => setBookingOpen(false)}
          initialServiceId={bookingServiceId}
        />
      )}
    </div>
  );
};

export default Index;
