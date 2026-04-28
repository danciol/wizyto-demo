import { salonConfig } from '@/config/salon';

export function applyTheme() {
  const root = document.documentElement;
  const { colors } = salonConfig;

  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--ring', colors.primary);
  root.style.setProperty('--sidebar-primary', colors.primary);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--gold', colors.accent);
  root.style.setProperty('--gold-light', colors.accentLight);
  root.style.setProperty('--gold-dark', colors.accentDark);
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--sidebar-accent', colors.secondary);

  // Ustaw tytuł strony
  document.title = salonConfig.name;
}
