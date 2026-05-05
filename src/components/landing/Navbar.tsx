import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'O nas', href: '#o-nas' },
  { label: 'Usługi', href: '#uslugi' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Kontakt', href: '#kontakt' },
];

interface NavbarProps {
  onBooking?: () => void;
}

export function Navbar({ onBooking }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 md:h-20 px-4">
        <Link to="/" className="font-heading text-2xl md:text-3xl font-bold text-primary tracking-wide">
          Bella Beauty Studio
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
          <Button
            onClick={onBooking}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            Umów wizytę
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-3">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="block w-full text-left py-2 text-foreground/80 hover:text-primary transition-colors font-medium"
            >
              {link.label}
            </button>
          ))}
          <Button
            onClick={() => { setMobileOpen(false); onBooking?.(); }}
            className="w-full bg-primary text-primary-foreground"
          >
            Umów wizytę
          </Button>
          <a href="tel:+48000000000" className="flex items-center gap-2 text-muted-foreground text-sm py-1">
            <Phone size={14} /> +48 000 000 000
          </a>
        </div>
      )}
    </nav>
  );
}
