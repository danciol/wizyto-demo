import { motion } from 'framer-motion';
import { Heart, Award, Clock, Sparkles } from 'lucide-react';

const features = [
  { icon: Heart, title: 'Pasja', desc: 'Kochamy to, co robimy. Każdy zabieg wykonujemy z sercem.' },
  { icon: Award, title: 'Doświadczenie', desc: 'Wieloletnie doświadczenie i stałe doskonalenie umiejętności.' },
  { icon: Clock, title: 'Punktualność', desc: 'Szanujemy Twój czas. Wizyty zawsze na czas.' },
  { icon: Sparkles, title: 'Jakość', desc: 'Używamy tylko najlepszych produktów renomowanych marek.' },
];

export function AboutSection() {
  return (
    <section id="o-nas" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">O nas</p>
          <h2 className="section-heading mb-4">Witaj w Bella Beauty Studio</h2>
          <p className="section-subheading">
            Nasz salon to miejsce, gdzie piękno spotyka się z profesjonalizmem.
            Zadbamy o Ciebie od stóp do głów.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
