import { useState, useMemo } from 'react';
import { useClients, useAppointments, useServices } from '@/hooks/useFirestore';
import { MessageSquare, Search, CheckSquare, Square, Send, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    label: '📢 Promocja',
    text: 'Hej! Mamy dla Ciebie wyjątkową ofertę w salonie Bella Beauty Studio. Zadzwoń lub zarezerwuj online 🌸',
  },
  {
    label: '🎉 Urodziny',
    text: 'Wszystkiego najlepszego! 🎂 Z okazji urodzin mamy dla Ciebie specjalną niespodziankę w salonie Bella Beauty Studio. Zapraszamy!',
  },
  {
    label: '🔔 Przypomnienie',
    text: 'Przypominamy o wizycie w salonie Bella Beauty Studio. Czekamy na Ciebie! W razie pytań zadzwoń do nas.',
  },
  {
    label: '💌 Powrót',
    text: 'Dawno Cię u nas nie było! Zapraszamy do salonu Bella Beauty Studio — mamy nowe usługi, które Cię zachwycą 💅',
  },
];

const AdminMessages = () => {
  const { clients, loading: loadingC } = useClients();
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const loading = loadingC || loadingA || loadingS;

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const toggleClient = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  };

  const selectedClients = clients.filter(c => selected.has(c.id));
  const phoneList = selectedClients.map(c => c.phone).filter(Boolean);

  // Generuje link SMS który otwiera aplikację wiadomości na telefonie
  // Na iOS/Android otwiera domyślną aplikację SMS z gotową wiadomością
  const buildSmsLink = () => {
    if (phoneList.length === 0 || !message.trim()) return '';
    const numbers = phoneList.join(',');
    const encoded = encodeURIComponent(message);
    // sms: z wieloma numerami działa na Android; iOS obsługuje tylko jeden na raz
    return `sms:${numbers}?body=${encoded}`;
  };

  const handleSend = () => {
    if (phoneList.length === 0) {
      toast.error('Zaznacz co najmniej jedną klientkę');
      return;
    }
    if (!message.trim()) {
      toast.error('Wpisz treść wiadomości');
      return;
    }

    const link = buildSmsLink();

    if (phoneList.length === 1) {
      // Jeden numer — otwieramy link bezpośrednio
      window.open(link, '_blank');
      setSent(true);
      toast.success('Otwarto aplikację SMS');
    } else {
      // Wiele numerów — na desktop kopiujemy numery i treść do schowka
      // Na mobile i tak trzeba wysłać osobno do każdej
      const text = `Numery:\n${phoneList.join('\n')}\n\nTreść:\n${message}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Skopiowano numery i treść do schowka!');
      });
      setSent(true);
    }
  };

  // Otwiera SMS do konkretnej klientki
  const openSingleSms = (phone: string) => {
    if (!message.trim()) {
      toast.error('Najpierw wpisz treść wiadomości');
      return;
    }
    const encoded = encodeURIComponent(message);
    window.open(`sms:${phone}?body=${encoded}`, '_blank');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Wiadomości SMS
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zaznacz klientki, napisz treść i wyślij SMS z telefonu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Lewa kolumna — lista klientek */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm">Wybierz klientki</h2>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              {selected.size === filtered.length && filtered.length > 0
                ? <><Square className="w-3.5 h-3.5" /> Odznacz wszystkie</>
                : <><CheckSquare className="w-3.5 h-3.5" /> Zaznacz wszystkie</>
              }
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj klientki..."
              className="pl-9"
            />
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Brak klientek</p>
            )}
            {filtered.map(client => {
              const isSelected = selected.has(client.id);
              const clientAppts = appointments.filter(
                a => a.clientPhone === client.phone || a.clientName === client.name
              );
              return (
                <div
                  key={client.id}
                  onClick={() => toggleClient(client.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-secondary/40 hover:bg-secondary/70 border border-transparent'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.phone} · {clientAppts.length} wizyt</p>
                  </div>
                  {isSelected && message.trim() && client.phone && (
                    <button
                      onClick={e => { e.stopPropagation(); openSingleSms(client.phone); }}
                      className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
                      title="Wyślij SMS tylko do tej klientki"
                    >
                      <Send className="w-3 h-3" /> SMS
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium pt-1 border-t border-border">
              <Users className="w-3.5 h-3.5" />
              Zaznaczono: {selected.size} {selected.size === 1 ? 'klientkę' : 'klientek'}
              <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Prawa kolumna — treść wiadomości */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Treść wiadomości</h2>

          {/* Szablony */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Szybkie szablony:</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => { setMessage(t.text); setSent(false); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pole tekstowe */}
          <div>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setSent(false); }}
              placeholder="Wpisz treść wiadomości SMS..."
              rows={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{message.length} znaków</span>
              <span>{Math.ceil(message.length / 160)} SMS {message.length > 160 ? '(długa wiadomość)' : ''}</span>
            </div>
          </div>

          {/* Podgląd */}
          {selected.size > 0 && message.trim() && (
            <div className="p-3 rounded-lg bg-secondary/50 text-xs space-y-1">
              <p className="font-medium text-muted-foreground">Podgląd wysyłki:</p>
              <p>📱 Do: {selected.size} {selected.size === 1 ? 'klientki' : 'klientek'}</p>
              <p className="text-muted-foreground italic">"{message.slice(0, 60)}{message.length > 60 ? '...' : ''}"</p>
            </div>
          )}

          {/* Przycisk wysyłki */}
          <div className="space-y-2">
            <Button
              onClick={handleSend}
              disabled={selected.size === 0 || !message.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold gap-2"
            >
              <Send className="w-4 h-4" />
              {selected.size <= 1
                ? 'Otwórz SMS na telefonie'
                : `Skopiuj ${selected.size} numerów + treść`
              }
            </Button>

            {selected.size > 1 && (
              <p className="text-xs text-center text-muted-foreground">
                Przy wielu klientkach numery i treść zostaną skopiowane do schowka — wklej je w aplikacji SMS na telefonie
              </p>
            )}

            {sent && (
              <p className="text-xs text-center text-green-600 font-medium">
                ✅ Gotowe! Pamiętaj żeby kliknąć "Wyślij" w aplikacji SMS
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
