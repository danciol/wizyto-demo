import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-foreground text-background/70 py-10">
      <div className="container mx-auto px-4 text-center">
        <p className="font-heading text-2xl font-bold text-background mb-2">Bella Beauty Studio</p>
        <p className="text-sm mb-1">Salon Kosmetyczny &middot; Kraków</p>
        <p className="text-sm mb-4 text-background/60">ul. Kwiatowa 12, Kraków</p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href="https://facebook.com/bellabeauty" target="_blank" rel="noopener noreferrer" className="text-xs text-background/50 hover:text-background/80 transition-colors">Facebook</a>
          <a href="https://instagram.com/bellabeauty" target="_blank" rel="noopener noreferrer" className="text-xs text-background/50 hover:text-background/80 transition-colors">Instagram</a>
          <Link to="/polityka-prywatnosci" className="text-xs text-background/50 hover:text-background/80 transition-colors">Polityka prywatności</Link>
          <Link to="/admin/login" className="text-xs text-background/40 hover:text-background/70 transition-colors underline">
            Panel pracownika
          </Link>
        </div>
        <p className="text-xs text-background/40">
          &copy; {new Date().getFullYear()} Bella Beauty Studio. Wszelkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
}
