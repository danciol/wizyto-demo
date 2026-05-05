import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-salon.jpg';

interface HeroProps {
  onBooking?: () => void;
}

export function HeroSection({ onBooking }: HeroProps) {

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Wnętrze salonu Bella Beauty Studio"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gold-light font-medium tracking-widest uppercase text-sm mb-4"
          >
            Salon Kosmetyczny
          </motion.p>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-cream leading-tight mb-6">
            Bella
            <br />
            <span className="text-gold">Beauty Studio</span>
          </h1>
          <p className="text-lg md:text-xl text-cream/80 mb-8 max-w-lg font-light leading-relaxed">
            Profesjonalne zabiegi kosmetyczne w eleganckim wnętrzu.
            Manicure, pedicure, rzęsy, brwi i wiele więcej.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={onBooking}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 py-6 font-semibold"
            >
              Umów wizytę
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.querySelector('#o-nas')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-cream/30 text-cream hover:bg-cream/10 text-base px-8 py-6"
            >
              Poznaj nas
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 rounded-full border-2 border-cream/40 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 rounded-full bg-cream/60" />
        </div>
      </motion.div>
    </section>
  );
}
