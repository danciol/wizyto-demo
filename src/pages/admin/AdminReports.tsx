import { useMemo, useState, useEffect } from 'react';
import { useAppointments, useServices, useEmployees } from '@/hooks/useFirestore';
import { TrendingUp, Users, Scissors, CreditCard, Loader2, Eye, Filter, UserX, FileDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlan } from '@/hooks/usePlan';
import { salonConfig } from '@/config/salon';

interface PhoneReveal {
  id: string;
  employeeName: string;
  clientName: string;
  clientPhone: string;
  revealedAt: string;
}

const AdminReports = () => {
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { can } = usePlan();
  const [phoneReveals, setPhoneReveals] = useState<PhoneReveal[]>([]);

  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'phone_reveals'), orderBy('revealedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPhoneReveals(snap.docs.map(d => ({ id: d.id, ...d.data() } as PhoneReveal)));
    });
    return unsub;
  }, []);

  const loading = loadingA || loadingS || loadingE;

  const setPreset = (preset: 'current' | 'last') => {
    const base = preset === 'current' ? new Date() : subMonths(new Date(), 1);
    setDateFrom(format(startOfMonth(base), 'yyyy-MM-dd'));
    setDateTo(format(endOfMonth(base), 'yyyy-MM-dd'));
  };

  const periodStart = startOfDay(parseISO(dateFrom));
  const periodEnd   = endOfDay(parseISO(dateTo));

  const isCurrent = dateFrom === format(startOfMonth(new Date()), 'yyyy-MM-dd') && dateTo === format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const isLast    = dateFrom === format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') && dateTo === format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  const periodAppointments = useMemo(() =>
    appointments.filter(a => {
      const d = new Date(a.date);
      if (!isWithinInterval(d, { start: periodStart, end: periodEnd })) return false;
      if (a.status === 'cancelled') return false;
      if (selectedEmployee !== 'all' && a.employeeId !== selectedEmployee) return false;
      return true;
    }), [appointments, periodStart, periodEnd, selectedEmployee]);

  const revenue = useMemo(() =>
    periodAppointments.reduce((sum, a) => {
      const s = services.find(s => s.id === a.serviceId);
      return sum + (s?.price || 0);
    }, 0), [periodAppointments, services]);

  const deposits = useMemo(() =>
    periodAppointments.reduce((sum, a) => sum + (a.depositStatus === 'paid' ? (a.depositAmount || 0) : 0), 0),
    [periodAppointments]);

  const visibleEmployees = (selectedEmployee === 'all'
    ? employees
    : employees.filter(e => e.id === selectedEmployee)
  ).filter(e => (e.role || 'pracownik') !== 'salon');

  const byEmployee = useMemo(() =>
    visibleEmployees.map(e => {
      const appts = periodAppointments.filter(a => a.employeeId === e.id);
      const rev = appts.reduce((sum, a) => sum + (services.find(s => s.id === a.serviceId)?.price || 0), 0);
      const reveals = phoneReveals.filter(r => r.employeeName === e.name).length;
      return { ...e, count: appts.length, revenue: rev, reveals };
    }).sort((a, b) => b.count - a.count), [visibleEmployees, periodAppointments, services, phoneReveals]);

  const byService = useMemo(() =>
    services.map(s => {
      const count = periodAppointments.filter(a => a.serviceId === s.id).length;
      return { ...s, count, total: count * s.price };
    }).filter(s => s.count > 0).sort((a, b) => b.count - a.count),
    [services, periodAppointments]);

  const filteredReveals = useMemo(() => {
    if (selectedEmployee === 'all') return phoneReveals;
    const emp = employees.find(e => e.id === selectedEmployee);
    return emp ? phoneReveals.filter(r => r.employeeName === emp.name) : phoneReveals;
  }, [phoneReveals, selectedEmployee, employees]);

  const noShowStats = useMemo(() => {
    if (!can('no_show_stats')) return [];
    const cancelled = appointments.filter(a => {
      const d = new Date(a.date);
      if (!isWithinInterval(d, { start: periodStart, end: periodEnd })) return false;
      if (a.status !== 'cancelled') return false;
      if (selectedEmployee !== 'all' && a.employeeId !== selectedEmployee) return false;
      return true;
    });
    const map = new Map<string, { name: string; count: number; lost: number }>();
    cancelled.forEach(a => {
      const key = a.clientPhone || a.clientName;
      const svc = services.find(s => s.id === a.serviceId);
      const cur = map.get(key) || { name: a.clientName, count: 0, lost: 0 };
      map.set(key, { name: a.clientName, count: cur.count + 1, lost: cur.lost + (svc?.price || 0) });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [can, appointments, services, selectedEmployee, periodStart, periodEnd]);

  const exportToPDF = () => {
    const periodLabel = `${format(periodStart, 'd MMM yyyy', { locale: pl })} — ${format(periodEnd, 'd MMM yyyy', { locale: pl })}`;
    const empName = selectedEmployee !== 'all' ? (employees.find(e => e.id === selectedEmployee)?.name ?? '') : '';

    const rows = (rows: string[]) => rows.join('');
    const tr = (cells: string[], head = false) =>
      `<tr>${cells.map(c => `<${head ? 'th' : 'td'}>${c}</${head ? 'th' : 'td'}>`).join('')}</tr>`;

    const employeeTable = byEmployee.length === 0 ? '<p class="empty">Brak danych</p>' : `
      <table>
        ${tr(['Pracownik', 'Wizyty', 'Przychód', 'Odkrycia tel.'], true)}
        ${rows(byEmployee.map(e => tr([e.name, String(e.count), `${e.revenue} zł`, e.reveals > 0 ? String(e.reveals) : '—'])))}
      </table>`;

    const serviceTable = byService.length === 0 ? '<p class="empty">Brak danych</p>' : `
      <table>
        ${tr(['Usługa', 'Liczba', 'Cena/szt.', 'Łącznie'], true)}
        ${rows(byService.map(s => tr([s.name, String(s.count), `${s.price} zł`, `${s.total} zł`])))}
      </table>`;

    const noShowTable = noShowStats.length === 0 ? '' : `
      <h2>No-show / Anulowania</h2>
      <table>
        ${tr(['Klient', 'Liczba anulowań', 'Utracony przychód'], true)}
        ${rows(noShowStats.map(ns => tr([ns.name, `${ns.count}×`, `-${ns.lost} zł`])))}
      </table>`;

    const revealsTable = filteredReveals.length === 0 ? '' : `
      <h2>Log odkryć numerów telefonu</h2>
      <table>
        ${tr(['Pracownik', 'Klient', 'Telefon', 'Data'], true)}
        ${rows(filteredReveals.map(r => tr([
          r.employeeName, r.clientName, r.clientPhone,
          format(new Date(r.revealedAt), 'd MMM yyyy HH:mm', { locale: pl }),
        ])))}
      </table>`;

    const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
<title>Raport — ${salonConfig.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;font-size:13px;color:#111;background:#fff;padding:32px 40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111}
  .salon-name{font-size:22px;font-weight:700;letter-spacing:-.3px}
  .salon-info{font-size:11px;color:#555;margin-top:4px;line-height:1.6}
  .report-meta{text-align:right}
  .report-title{font-size:14px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.06em}
  .report-period{font-size:18px;font-weight:700;margin-top:4px}
  .report-filter{font-size:11px;color:#777;margin-top:2px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  .stat{border:1px solid #ddd;border-radius:6px;padding:12px 14px}
  .stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:4px}
  .stat-value{font-size:20px;font-weight:700}
  h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px solid #ddd}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{background:#f5f5f5;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#555;padding:7px 10px;text-align:left;border-bottom:2px solid #ddd}
  td{padding:7px 10px;border-bottom:1px solid #eee;font-size:12px}
  tr:last-child td{border-bottom:none}
  .empty{color:#999;font-size:12px;font-style:italic;padding:8px 0}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:right}
  .print-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:Georgia,serif;margin-bottom:24px}
  .print-btn:hover{background:#333}
  @media print{.print-btn{display:none}body{padding:16px 20px}@page{margin:1.2cm}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Drukuj raport</button>
<div class="header">
  <div>
    <div class="salon-name">${salonConfig.name}</div>
    <div class="salon-info">${[salonConfig.address, salonConfig.phone, salonConfig.email].filter(Boolean).join(' · ')}</div>
  </div>
  <div class="report-meta">
    <div class="report-title">Raport przychodów</div>
    <div class="report-period">${periodLabel}</div>
    ${empName ? `<div class="report-filter">Pracownik: ${empName}</div>` : ''}
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="stat-label">Wizyty</div><div class="stat-value">${periodAppointments.length}</div></div>
  <div class="stat"><div class="stat-label">Przychód</div><div class="stat-value">${revenue} zł</div></div>
  <div class="stat"><div class="stat-label">Zaliczki</div><div class="stat-value">${deposits} zł</div></div>
  <div class="stat"><div class="stat-label">Odkrycia tel.</div><div class="stat-value">${filteredReveals.length}</div></div>
</div>

<h2>Pracownicy</h2>
${employeeTable}

<h2>Usługi</h2>
${serviceTable}

${noShowTable}
${revealsTable}

<div class="footer">Wygenerowano ${format(new Date(), 'd MMM yyyy HH:mm', { locale: pl })} · ${salonConfig.name}</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />Raporty
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(periodStart, 'd MMM yyyy', { locale: pl })} — {format(periodEnd, 'd MMM yyyy', { locale: pl })}
          </p>
        </div>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <FileDown className="w-4 h-4" />
          Eksportuj PDF
        </button>
      </div>

      {/* Filtry */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4 text-primary" />
          Filtry
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Szybki wybór okresu */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Szybki wybór</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPreset('current')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                Bieżący miesiąc
              </button>
              <button
                onClick={() => setPreset('last')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isLast ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                Poprzedni miesiąc
              </button>
            </div>
          </div>

          {/* Zakres dat */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Od</p>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Do</p>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Pracownik */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pracownik</p>
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Wszyscy pracownicy</option>
              {employees
                .filter(e => (e.role || 'pracownik') !== 'salon')
                .map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Wizyty', value: periodAppointments.length, icon: Scissors, color: 'text-primary' },
          { label: 'Przychód', value: `${revenue} zł`, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Zaliczki', value: `${deposits} zł`, icon: CreditCard, color: 'text-accent' },
          { label: 'Odkrycia tel.', value: filteredReveals.length, icon: Eye, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raport pracowniczy */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Pracownicy</h2>
          {byEmployee.length === 0
            ? <p className="text-muted-foreground text-sm text-center py-8">Brak danych</p>
            : <div className="space-y-3">
                {byEmployee.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.count} wizyt · {e.revenue} zł
                        {e.reveals > 0 && <span className="text-destructive ml-1">· {e.reveals}x odkryto tel.</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{e.revenue} zł</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Raport usług */}
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Scissors className="w-4 h-4 text-primary" />Najpopularniejsze usługi</h2>
          {byService.length === 0
            ? <p className="text-muted-foreground text-sm text-center py-8">Brak danych</p>
            : <div className="space-y-3">
                {byService.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count}x · {s.price} zł/szt</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{s.total} zł</p>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* No-show stats */}
      {can('no_show_stats') && noShowStats.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <UserX className="w-4 h-4 text-destructive" />
            No-show / Anulowania w tym okresie
          </h2>
          <div className="space-y-3">
            {noShowStats.map((ns, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-sm">{ns.name}</p>
                  <p className="text-xs text-muted-foreground">{ns.count}× anulowano</p>
                </div>
                <p className="text-sm font-semibold text-destructive">-{ns.lost} zł</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log odkryć telefonów */}
      {filteredReveals.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-destructive" />
            Log odkryć numerów telefonu
          </h2>
          <div className="space-y-2">
            {filteredReveals.slice(0, 20).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm">
                <div>
                  <span className="font-medium">{r.employeeName}</span>
                  <span className="text-muted-foreground"> odkrył numer </span>
                  <span className="font-medium">{r.clientName}</span>
                  <span className="text-muted-foreground"> ({r.clientPhone})</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {format(new Date(r.revealedAt), 'd MMM HH:mm', { locale: pl })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
