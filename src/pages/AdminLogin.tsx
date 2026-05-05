import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap } from 'lucide-react';
import { IS_DEMO, DEMO_CREDENTIALS } from '@/config/demo';

const AdminLogin = () => {
  const [login, setLogin] = useState(IS_DEMO ? DEMO_CREDENTIALS.email : '');
  const [password, setPassword] = useState(IS_DEMO ? DEMO_CREDENTIALS.password : '');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login: doLogin } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) { toast.error('Wprowadź login i hasło'); return; }
    setIsLoading(true);
    const success = await doLogin(login, password);
    setIsLoading(false);
    if (success) { toast.success('Zalogowano pomyślnie'); navigate('/admin'); }
    else toast.error('Nieprawidłowy login lub hasło');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-primary mb-2">
            {IS_DEMO ? 'Wizyto Demo' : 'Bella Beauty Studio'}
          </h1>
          <p className="text-muted-foreground text-sm">Panel pracownika</p>
        </div>
        {IS_DEMO && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
              <Zap className="w-4 h-4" /> Wersja demonstracyjna
            </div>
            <p className="text-xs text-amber-600 mb-3">Dane przykładowe, resetowane każdej nocy.</p>
            <div className="bg-white rounded-lg p-3 text-xs font-mono space-y-1 border border-amber-100">
              <div><span className="text-muted-foreground">Login: </span><strong>{DEMO_CREDENTIALS.email}</strong></div>
              <div><span className="text-muted-foreground">Hasło: </span><strong>{DEMO_CREDENTIALS.password}</strong></div>
            </div>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div><Label htmlFor="login">Login</Label>
            <Input id="login" type="text" placeholder="Twój login" value={login} onChange={e => setLogin(e.target.value)} /></div>
          <div><Label htmlFor="password">Hasło</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logowanie...</> : 'Zaloguj się'}
          </Button>
        </form>
        {IS_DEMO ? (
          <p className="text-xs text-center mt-6">
            <a href="https://wizyto.pl#kontakt" className="text-primary font-semibold hover:underline">Kup Wizyto dla swojego salonu →</a>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center mt-6">Login i hasło ustala administrator w zakładce Pracownicy</p>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
