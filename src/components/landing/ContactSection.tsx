import { motion } from 'framer-motion';
import { Phone, MapPin, Facebook, Instagram } from 'lucide-react';

export function ContactSection() {
  return (
    <section id="kontakt" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">Kontakt</p>
          <h2 className="section-heading mb-4">Skontaktuj się z nami</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adres</p>
                <p className="font-medium">ul. Kwiatowa 12, Kraków</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <a href="tel:+48123456789" className="font-medium hover:text-primary transition-colors">+48 123 456 789</a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Facebook className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Facebook</p>
                <a href="https://facebook.com/bellabeauty" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors">bellabeauty</a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Instagram className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instagram</p>
                <a href="https://instagram.com/bellabeauty" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors">bellabeauty</a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card overflow-hidden rounded-xl h-72 md:h-full min-h-[280px]"
          >
            <iframe
              title="Lokalizacja Bella Beauty Studio"
              src="https://maps.google.com/maps?q=ul.+Kwiatowa+12,+Krak%C3%B3w,+Polska&output=embed&hl=pl"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
