import { Clock, Trash2, Loader2, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { useWaitingList } from '@/hooks/useFirestore';
import { sendSms } from '@/lib/textbee';

const AdminWaitingList = () => {
  const { waitingList, loading, removeFromWaitingList, markNotified } = useWaitingList();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleNotify = async (entry: typeof waitingList[0]) => {
    setActionId(entry.id);
    const message = `Hej ${entry.clientName}! Zwolnił się termin na usługę ${entry.serviceName} u ${entry.employeeName}. Zarezerwuj wizytę: ${window.location.origin}`;
    try {
      await sendSms([entry.clientPhone], message);
      await markNotified(entry.id);
      toast.success(`SMS wysłany do ${entry.clientName}`);
    } catch {
      const smsUrl = `sms:${entry.clientPhone}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_blank');
      await markNotified(entry.id);
      toast.info('Otwarto aplikację SMS — wyślij ręcznie');
    }
    setActionId(null);
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      await removeFromWaitingList(id);
      toast.success('Usunięto z listy');
    } catch {
      toast.error('Błąd usuwania');
    }
    setActionId(null);
  };

  const pending = waitingList.filter(e => !e.notified);
  const notified = waitingList.filter(e => e.notified);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Lista oczekujących
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} {pending.length === 1 ? 'osoba czeka' : 'osób czeka'} na wolny termin
        </p>
      </div>

      {waitingList.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nikt nie czeka na wolny termin</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/30">
                <p className="text-sm font-medium">Do powiadomienia ({pending.length})</p>
              </div>
              <div className="divide-y divide-border/50">
                {pending.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{entry.clientName}</p>
                      <p className="text-xs text-muted-foreground">{entry.clientPhone}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.serviceName} · {entry.employeeName} ·{' '}
                        <span className="text-primary font-medium">
                          {format(new Date(entry.preferredDate + 'T12:00:00'), 'd MMM yyyy', { locale: pl })}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Zapisano {format(new Date(entry.createdAt), 'd MMM, HH:mm', { locale: pl })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      <Button
                        variant="outline" size="sm"
                        disabled={actionId === entry.id}
                        onClick={() => handleNotify(entry)}
                        className="gap-1.5 text-xs"
                      >
                        {actionId === entry.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <MessageSquare className="w-3 h-3" />}
                        Powiadom SMS
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        disabled={actionId === entry.id}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notified.length > 0 && (
            <div className="glass-card overflow-hidden opacity-60">
              <div className="px-5 py-3 border-b border-border bg-secondary/30">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  Powiadomieni ({notified.length})
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {notified.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{entry.clientName} · {entry.clientPhone}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.serviceName} · {entry.employeeName} · {format(new Date(entry.preferredDate + 'T12:00:00'), 'd MMM yyyy', { locale: pl })}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 ml-3 shrink-0"
                      disabled={actionId === entry.id}
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminWaitingList;
