import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DISMISSED_KEY = 'pwa_banner_dismissed_until';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    if (isIOS()) {
      setShowIOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96">
      <div
        className="rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 text-white"
        style={{ backgroundColor: '#2d5a3d' }}
      >
        <span className="text-2xl shrink-0 mt-0.5">📱</span>
        <div className="flex-1 min-w-0">
          {showIOS ? (
            <>
              <p className="font-semibold text-sm">Zainstaluj aplikację</p>
              <p className="text-xs opacity-85 mt-0.5">
                Kliknij <strong>⎦ Udostępnij</strong> → <strong>Dodaj do ekranu głównego</strong>
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm">Zainstaluj panel na telefonie</p>
              <p className="text-xs opacity-85 mt-0.5">Szybki dostęp jak zwykła aplikacja</p>
              <button
                onClick={handleInstall}
                className="mt-2 px-3 py-1 rounded-md text-xs font-semibold"
                style={{ backgroundColor: '#c9973a', color: '#fff' }}
              >
                Zainstaluj
              </button>
            </>
          )}
        </div>
        <button onClick={handleDismiss} className="opacity-70 hover:opacity-100 transition-opacity shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
