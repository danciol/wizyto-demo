import { useState } from 'react';
import { X, Zap } from 'lucide-react';

export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white">
      <div className="flex items-center justify-between px-4 py-2 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="w-4 h-4 shrink-0" />
          <span>Wersja demonstracyjna Velianow — dane resetują się każdej nocy.{' '}
            <a href="https://www.velianow.pl" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-100">
              Kup teraz i zacznij za darmo →
            </a>
          </span>
        </div>
        <button onClick={() => setHidden(true)} className="ml-4 hover:text-amber-200 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
