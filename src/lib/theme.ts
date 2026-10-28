import { salonConfig } from '@/config/salon';

export function applyTheme() {
  const root = document.documentElement;
  // Pola opcjonalne — nie każdy salon.ts je ma
  const colors = salonConfig.colors as typeof salonConfig.colors & Partial<Record<'foreground' | 'muted' | 'mutedForeground' | 'border', string>>;

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

  // Opcjonalnie: tekst, tła pomocnicze i obramowania (bez nich zostają domyślne z index.css)
  const optional: Record<string, string | undefined> = {
    '--foreground': colors.foreground,
    '--card-foreground': colors.foreground,
    '--popover-foreground': colors.foreground,
    '--secondary-foreground': colors.foreground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--border': colors.border,
    '--input': colors.border,
  };
  for (const [prop, value] of Object.entries(optional)) {
    if (value) root.style.setProperty(prop, value);
  }

  // Ustaw tytuł strony
  document.title = salonConfig.name;
}
