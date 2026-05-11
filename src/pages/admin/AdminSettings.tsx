import { useState, useEffect } from 'react';
import { Settings, CreditCard, Loader2, Save, MessageSquare, ExternalLink, Images } from 'lucide-react';
import { useSettings } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AdminSettings = () => {
  const { depositAmount, textBeeApiKey, textBeeDeviceId, cloudinaryCloudName, cloudinaryUploadPreset, loading, saveDepositAmount, saveTextBee, saveCloudinary } = useSettings();
  const [depositValue, setDepositValue] = useState('');
  const [tbApiKey, setTbApiKey] = useState('');
  const [tbDeviceId, setTbDeviceId] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [savingTextBee, setSavingTextBee] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [savingCloudinary, setSavingCloudinary] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDepositValue(depositAmount > 0 ? String(depositAmount) : '');
      setTbApiKey(textBeeApiKey || '');
      setTbDeviceId(textBeeDeviceId || '');
      setCloudName(cloudinaryCloudName || '');
      setUploadPreset(cloudinaryUploadPreset || '');
    }
  }, [depositAmount, textBeeApiKey, textBeeDeviceId, cloudinaryCloudName, cloudinaryUploadPreset, loading]);

  const handleSaveDeposit = async () => {
    const amount = Number(depositValue);
    if (depositValue !== '' && (isNaN(amount) || amount < 0)) { toast.error('Podaj prawidłową kwotę'); return; }
    setSavingDeposit(true);
    try { await saveDepositAmount(amount); toast.success(amount > 0 ? `Zaliczka: ${amount} zł` : 'Zaliczka wyłączona'); }
    catch { toast.error('Błąd zapisu'); } finally { setSavingDeposit(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" />Ustawienia</h1>
        <p className="text-sm text-muted-foreground mt-1">Globalne ustawienia salonu</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /><h2 className="font-semibold">Zaliczka przy rezerwacji</h2></div>
        <div className="space-y-2">
          <Label>Wysokość zaliczki (zł)</Label>
          <div className="flex gap-3">
            <Input type="number" min="0" value={depositValue} onChange={e => setDepositValue(e.target.value)} placeholder="np. 50" className="max-w-[160px]" />
            <Button onClick={handleSaveDeposit} disabled={savingDeposit} className="gap-2">
              {savingDeposit ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{depositValue && Number(depositValue) > 0 ? `Klientka zapłaci ${depositValue} zł zaliczki` : 'Brak zaliczki'}</p>
        </div>
        {depositAmount > 0 ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">✅ Aktywna zaliczka: <strong>{depositAmount} zł</strong></div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Zaliczka wyłączona</div>
        )}
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /><h2 className="font-semibold">TextBee SMS</h2></div>
        <p className="text-xs text-muted-foreground">
          Wpisz klucz API i Device ID z <a href="https://textbee.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">textbee.dev <ExternalLink className="w-3 h-3" /></a> żeby wysyłać SMS-y bezpośrednio z aplikacji.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input value={tbApiKey} onChange={e => setTbApiKey(e.target.value)} placeholder="tb_xxxxxxxxxxxxxxxx" className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label>Device ID</Label>
            <Input value={tbDeviceId} onChange={e => setTbDeviceId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="font-mono text-xs" />
          </div>
          <Button onClick={async () => {
            setSavingTextBee(true);
            try { await saveTextBee(tbApiKey.trim(), tbDeviceId.trim()); toast.success('TextBee zapisany'); }
            catch { toast.error('Błąd zapisu'); } finally { setSavingTextBee(false); }
          }} disabled={savingTextBee} className="gap-2">
            {savingTextBee ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
          </Button>
        </div>
        {textBeeApiKey && textBeeDeviceId ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">✅ TextBee skonfigurowany</div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Brak konfiguracji — SMS-y będą otwierać aplikację telefonu</div>
        )}
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><Images className="w-5 h-5 text-primary" /><h2 className="font-semibold">Cloudinary — galeria zdjęć</h2></div>
        <p className="text-xs text-muted-foreground">
          Wpisz dane z konta <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">cloudinary.com <ExternalLink className="w-3 h-3" /></a> żeby wgrywać zdjęcia do galerii.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cloud Name</Label>
            <Input value={cloudName} onChange={e => setCloudName(e.target.value)} placeholder="np. mycloud123" className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label>Upload Preset (unsigned)</Label>
            <Input value={uploadPreset} onChange={e => setUploadPreset(e.target.value)} placeholder="np. gallery_unsigned" className="font-mono text-xs" />
          </div>
          <Button onClick={async () => {
            setSavingCloudinary(true);
            try { await saveCloudinary(cloudName.trim(), uploadPreset.trim()); toast.success('Cloudinary zapisany'); }
            catch { toast.error('Błąd zapisu'); } finally { setSavingCloudinary(false); }
          }} disabled={savingCloudinary} className="gap-2">
            {savingCloudinary ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
          </Button>
        </div>
        {cloudinaryCloudName && cloudinaryUploadPreset ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">✅ Cloudinary skonfigurowany: <strong>{cloudinaryCloudName}</strong></div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Brak konfiguracji — galeria nie będzie działać</div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
