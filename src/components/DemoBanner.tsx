import { useLayoutEffect, useRef, useState } from 'react';
import { X, Zap } from 'lucide-react';

// Pasek demo w barwach Velianow. Swoją wysokość podaje w --demo-banner-h,
// żeby przyklejona nawigacja i panel (klasa .below-demo-banner) zaczynały się pod nim.
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (hidden || !el) { root.style.setProperty('--demo-banner-h', '0px'); return; }
    const update = () => root.style.setProperty('--demo-banner-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.setProperty('--demo-banner-h', '0px'); };
  }, [hidden]);

  if (hidden) return null;
  return (
    <div ref={ref} className="fixed top-0 left-0 right-0 z-[200] bg-[#0D0D0D] text-[#F7F4EF]">
      <div className="flex items-center justify-between px-4 py-2 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="w-4 h-4 shrink-0 text-[#D4AF37]" />
          <span>Wersja demonstracyjna Velianow — płatności działają w trybie testowym, bez pobierania pieniędzy.{' '}
            <a href="https://www.velianow.pl" target="_blank" rel="noopener noreferrer" className="underline font-bold text-[#D4AF37] hover:text-[#f0d878]">
              Kup teraz i zacznij za darmo →
            </a>
          </span>
        </div>
        <button onClick={() => setHidden(true)} className="ml-4 text-[#F7F4EF]/70 hover:text-[#F7F4EF] shrink-0" aria-label="Zamknij pasek demo">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
