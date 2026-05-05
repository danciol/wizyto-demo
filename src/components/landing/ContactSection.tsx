import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Instagram } from 'lucide-react';

const info = [
  { icon: MapPin, label: 'Adres', value: 'ul. Piękna 15, 00-001 Warszawa' },
  { icon: Phone, label: 'Telefon', value: '+48 000 000 000' },
  { icon: Mail, label: 'Email', value: 'kontakt@bellabeauty.pl' },
  { icon: Clock, label: 'Godziny', value: 'Pon-Pt: 9:00-18:00 | Sob: 9:00-14:00' },
];

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
            {info.map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-primary" />
              </a>
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
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2443.916!2d21.012!3d52.229!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTLCsDEzJzQ0LjQiTiAyMcKwMDAnNDMuMiJF!5e0!3m2!1spl!2spl!4v1"
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
