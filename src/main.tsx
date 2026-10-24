import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "./lib/theme";

applyTheme();

if ('serviceWorker' in navigator) {
  // Wymuś przeładowanie gdy SW aktywuje nową wersję (Android + iOS)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // iOS Safari nie sprawdza aktualizacji SW przy każdym uruchomieniu —
  // periodyczne update() wymusza pobranie nowej wersji gdy app jest otwarta
  navigator.serviceWorker.ready.then(reg => {
    setInterval(() => reg.update(), 5 * 60 * 1000); // co 5 minut
  });
}

createRoot(document.getElementById("root")!).render(<App />);
