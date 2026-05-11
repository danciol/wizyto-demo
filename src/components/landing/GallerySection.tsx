import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
}

import gallery1 from '@/assets/gallery-1.jpg';
import gallery2 from '@/assets/gallery-2.jpg';
import gallery3 from '@/assets/gallery-3.jpg';
import gallery4 from '@/assets/gallery-4.jpg';

const placeholders = [
  { id: 'p1', url: gallery1, name: 'Profesjonalny manicure' },
  { id: 'p2', url: gallery2, name: 'Przedłużanie rzęs' },
  { id: 'p3', url: gallery3, name: 'Lakiery do paznokci' },
  { id: 'p4', url: gallery4, name: 'Stanowisko stylistki' },
];

export function GallerySection() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const displayed = images.length > 0 ? images : placeholders;

  const prev = () => setLightbox(i => i !== null ? (i - 1 + displayed.length) % displayed.length : null);
  const next = () => setLightbox(i => i !== null ? (i + 1) % displayed.length : null);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, displayed.length]);

  return (
    <section id="galeria" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">Galeria</p>
          <h2 className="section-heading mb-4">Nasze realizacje</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {displayed.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setLightbox(i)}
              className="overflow-hidden rounded-xl aspect-square group cursor-pointer"
            >
              <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                width={800}
                height={800}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {displayed.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                onClick={e => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                onClick={e => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <img
            src={displayed[lightbox].url}
            alt={displayed[lightbox].name}
            className="max-w-full max-h-full rounded-xl object-contain select-none"
            onClick={e => e.stopPropagation()}
          />

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightbox + 1} / {displayed.length}
          </p>
        </div>
      )}
    </section>
  );
}
