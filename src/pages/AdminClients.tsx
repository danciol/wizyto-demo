import { useState, useMemo } from 'react';
import { useClients, useAppointments, useServices } from '@/hooks/useFirestore';
import type { Client } from '@/data/services';
import { Users, Search, Loader2, Phone, Mail, Calendar, Plus, ChevronDown, ChevronUp, Pencil, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ClientForm = Pick<Client, 'name' | 'phone' | 'email'>;

const emptyForm: ClientForm = {
  name: '',
  phone: '',
  email: '',
};

const statusLabels = {
  pending: 'Oczekuje',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  completed: 'Zakończona',
} as const;

const statusClasses = {
  pending: 'bg-accent/10 text-accent-foreground',
  confirmed: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
  completed: 'bg-secondary text-secondary-foreground',
} as const;

const AdminClients = () => {
  const { clients, loading: loadingC, addClient, updateClient } = useClients();
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { can } = usePlan();
  const { employee } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const phoneProtection = can('phone_protection');
  const isAdmin = employee?.role === 'admin';

  const revealPhone = async (clientId: string, clientName: string, phone: string) => {
    setRevealedPhones(prev => new Set([...prev, clientId]));
    if (phoneProtection && !isAdmin) {
      await addDoc(collection(db, 'phone_reveals'), {
        employeeName: employee?.name || 'Nieznany',
        clientName,
        clientPhone: phone,
        revealedAt: new Date().toISOString(),
      });
    }
  };

  const loading = loadingC || loadingA || loadingS;

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const clientAppointmentsMap = useMemo(() => {
    const map = new Map<string, typeof appointments>();

    clients.forEach((client) => {
      const linkedIds = new Set(client.appointmentIds || []);

      appointments.forEach((appointment) => {
        if (
          linkedIds.has(appointment.id) ||
          (client.phone && appointment.clientPhone === client.phone) ||
          appointment.clientName === client.name
        ) {
          linkedIds.add(appointment.id);
        }
      });

      const clientAppointments = appointments
        .filter((appointment) => linkedIds.has(appointment.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      map.set(client.id, clientAppointments);
    });

    return map;
  }, [appointments, clients]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setForm(emptyForm);
  };

  const openAddDialog = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
    });
    setDialogOpen(true);
  };

  const handleSaveClient = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name) return;

    const existingLinks = editingClient
      ? clientAppointmentsMap.get(editingClient.id)?.map((appointment) => appointment.id) || []
      : appointments
          .filter((appointment) => (phone && appointment.clientPhone === phone) || appointment.clientName === name)
          .map((appointment) => appointment.id);

    const appointmentIds = Array.from(new Set([...(editingClient?.appointmentIds || []), ...existingLinks]));

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name,
          phone,
          email,
          appointmentIds,
        });
        toast.success('Dane klienta zapisane');
      } else {
        await addClient({
          name,
          phone,
          email,
          appointmentIds,
        });
        toast.success('Klient dodany');
      }

      closeDialog();
    } catch {
      toast.error('Nie udało się zapisać klienta');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Klienci ({clients.length})
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj klienta..."
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={openAddDialog} className="gap-1.5">
            <Plus className="w-4 h-4" /> Dodaj klienta
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {search ? 'Nie znaleziono klientów' : 'Brak klientów w bazie'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const clientAppts = clientAppointmentsMap.get(client.id) || [];
            const lastAppt = clientAppts[0];
            const lastService = lastAppt ? services.find(s => s.id === lastAppt.serviceId) : null;
            const isExpanded = expandedId === client.id;

            return (
              <div key={client.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-foreground mb-2">{client.name}</h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(client)} title="Edytuj klienta">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {clientAppts.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedId(isExpanded ? null : client.id)}
                        title={isExpanded ? 'Zwiń historię' : 'Rozwiń historię'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {client.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {phoneProtection && !isAdmin && !revealedPhones.has(client.id)
                        ? <>
                            <span className="tracking-widest">••• ••• •••</span>
                            <button
                              onClick={() => revealPhone(client.id, client.name, client.phone)}
                              className="flex items-center gap-1 text-xs text-primary hover:underline ml-1"
                            >
                              <Eye className="w-3 h-3" /> Odkryj
                            </button>
                          </>
                        : <span>{client.phone}</span>
                      }
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" /> {client.email}
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Wizyt: {clientAppts.length}
                  </p>
                  {lastAppt && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Ostatnia: {format(new Date(lastAppt.date), 'd MMM yyyy', { locale: pl })}
                      {lastService && ` · ${lastService.name}`}
                    </p>
                  )}
                </div>

                {isExpanded && clientAppts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Historia wizyt</p>
                    {clientAppts.map(appt => {
                      const svc = services.find(s => s.id === appt.serviceId);
                      return (
                        <div key={appt.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-secondary/40">
                          <div>
                            <span className="font-medium">{svc?.name || 'Wizyta'}</span>
                            <span className="text-muted-foreground ml-2">
                              {format(new Date(appt.date), 'd MMM yyyy, HH:mm', { locale: pl })}
                            </span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusClasses[appt.status]}`}>
                            {statusLabels[appt.status]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edytuj klienta' : 'Dodaj klienta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Imię i nazwisko *</Label>
              <Input value={form.name} onChange={e => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Jan Kowalski" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => setForm((current) => ({ ...current, phone: e.target.value }))} placeholder="+48 600 100 200" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={closeDialog}>Anuluj</Button>
              <Button onClick={handleSaveClient} disabled={!form.name.trim()}>{editingClient ? 'Zapisz' : 'Dodaj'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;
