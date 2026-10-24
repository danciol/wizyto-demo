import { useState, useEffect } from 'react';
import { Settings, CreditCard, Loader2, Save, MessageSquare, ExternalLink, Images, Star, Code, Copy, Check } from 'lucide-react';
import { useSettings } from '@/hooks/useFirestore';
import { usePlan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AdminSettings = () => {
  const { depositAmount, textBeeApiKey, textBeeDeviceId, cloudinaryCloudName, cloudinaryUploadPreset, googleReviewsUrl, loading, saveDepositAmount, saveTextBee, saveCloudinary, saveGoogleReviews } = useSettings();
  const { can } = usePlan();

  const [depositValue, setDepositValue] = useState('');
  const [tbApiKey, setTbApiKey] = useState('');
  const [tbDeviceId, setTbDeviceId] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [reviewsUrl, setReviewsUrl] = useState('');
  const [savingTextBee, setSavingTextBee] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [savingReviews, setSavingReviews] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDepositValue(depositAmount > 0 ? String(depositAmount) : '');
      setTbApiKey(textBeeApiKey || '');
      setTbDeviceId(textBeeDeviceId || '');
      setCloudName(cloudinaryCloudName || '');
      setUploadPreset(cloudinaryUploadPreset || '');
      setReviewsUrl(googleReviewsUrl || '');
    }
  }, [depositAmount, textBeeApiKey, textBeeDeviceId, cloudinaryCloudName, cloudinaryUploadPreset, googleReviewsUrl, loading]);

  const handleSaveDeposit = async () => {
    const amount = Number(depositValue);
    if (depositValue !== '' && (isNaN(amount) || amount < 0)) { toast.error('Podaj prawidłową kwotę'); return; }
    setSavingDeposit(true);
    try { await saveDepositAmount(amount); toast.success(amount > 0 ? `Zaliczka: ${amount} zł` : 'Zaliczka wyłączona'); }
    catch { toast.error('Błąd zapisu'); } finally { setSavingDeposit(false); }
  };

  const widgetUrl = `${window.location.origin}/widget`;
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:16px;overflow:hidden;"></iframe>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(iframeCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast.success('Kod skopiowany!');
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

      {can('messages') && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2"><Star className="w-5 h-5 text-primary" /><h2 className="font-semibold">Opinie Google</h2></div>
          <p className="text-xs text-muted-foreground">
            Po zakończeniu wizyty aplikacja automatycznie wyśle SMS z prośbą o opinię w Google. Wklej link do swojego profilu Google Business.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Link do opinii Google</Label>
              <Input value={reviewsUrl} onChange={e => setReviewsUrl(e.target.value)} placeholder="https://g.page/r/..." className="text-xs" />
            </div>
            <Button onClick={async () => {
              setSavingReviews(true);
              try { await saveGoogleReviews(reviewsUrl.trim()); toast.success('Link zapisany'); }
              catch { toast.error('Błąd zapisu'); } finally { setSavingReviews(false); }
            }} disabled={savingReviews} className="gap-2">
              {savingReviews ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
            </Button>
          </div>
          {googleReviewsUrl ? (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">✅ SMS z opinią będzie wysyłany automatycznie po zakończeniu wizyty</div>
          ) : (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Wpisz link żeby aktywować automatyczne SMS-y z prośbą o opinię</div>
          )}
        </div>
      )}

      {can('online_booking') && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" /><h2 className="font-semibold">Widget rezerwacji</h2></div>
          <p className="text-xs text-muted-foreground">
            Wklej ten kod na swojej stronie www lub użyj linku bezpośrednio w bio na Instagramie.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Link bezpośredni</Label>
              <div className="flex gap-2">
                <Input value={widgetUrl} readOnly className="font-mono text-xs bg-secondary/50" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(widgetUrl); toast.success('Link skopiowany!'); }} className="shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kod iframe (do wklejenia na stronę www)</Label>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-secondary/50 border border-border text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">{iframeCode}</pre>
                <Button
                  variant="outline" size="sm"
                  className="absolute top-2 right-2 gap-1.5"
                  onClick={handleCopyCode}
                >
                  {codeCopied ? <><Check className="w-3.5 h-3.5 text-green-600" />Skopiowano</> : <><Copy className="w-3.5 h-3.5" />Kopiuj</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
