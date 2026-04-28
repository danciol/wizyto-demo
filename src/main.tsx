import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "./lib/theme";

// Zastosuj kolory i nazwę salonu z konfigu
applyTheme();

createRoot(document.getElementById("root")!).render(<App />);
