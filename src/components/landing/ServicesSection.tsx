import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, Loader2 } from 'lucide-react';
import { categories } from '@/data/services';
import { useServices } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';

interface Props {
  onBookService?: (serviceId: string) => void;
}

export function ServicesSection({ onBookService }: Props) {
  const [activeCategory, setActiveCategory] = useState('manicure');
  const { services, loading } = useServices();

  const filtered = services.filter(s => s.category === activeCategory && s.active !== false && s.selfBooking !== false);

  return (
    <section id="uslugi" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">Usługi</p>
          <h2 className="section-heading mb-4">Nasze zabiegi</h2>
          <p className="section-subheading">
            Odkryj pełną ofertę zabiegów kosmetycznych Bella Beauty Studio
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto"
            >
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className="glass-card p-6 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-heading text-lg font-semibold group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-lg font-bold text-primary whitespace-nowrap ml-3">
                      {service.price} zł
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} /> {service.duration} min
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 hover:bg-primary/5 text-xs p-0 h-auto font-semibold"
                      onClick={() => onBookService?.(service.id)}
                    >
                      Umów się <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8 col-span-full">Brak usług w tej kategorii</p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
