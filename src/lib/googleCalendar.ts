import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: string; error?: string }) => void;
            error_callback?: (error: unknown) => void;
          }) => { requestAccessToken: (overrides?: { prompt?: string }) => void };
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Nie udało się załadować biblioteki Google'));
    document.head.appendChild(script);
  });
}

async function getEmployeeToken(employeeId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'employee_google_tokens', employeeId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.expiresAt && data.expiresAt < Date.now()) return null;
  return data.accessToken || null;
}

async function getClientId(): Promise<string | null> {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  return snap.exists() ? snap.data().googleClientId || null : null;
}

export async function authorizeGoogleCalendar(employeeId: string): Promise<boolean> {
  const clientId = await getClientId();
  if (!clientId) throw new Error('Brak Google Client ID w ustawieniach');

  await loadGisScript();

  return new Promise((resolve) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: async (response) => {
        if (response.error || !response.access_token) { resolve(false); return; }
        const expiresIn = parseInt(response.expires_in || '3600');
        await setDoc(doc(db, 'employee_google_tokens', employeeId), {
          accessToken: response.access_token,
          expiresAt: Date.now() + expiresIn * 1000,
          clientId,
          connectedAt: new Date().toISOString(),
        }, { merge: true });
        await setDoc(doc(db, 'employees', employeeId), { googleCalendarConnected: true }, { merge: true });
        resolve(true);
      },
      error_callback: () => resolve(false),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function disconnectGoogleCalendar(employeeId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'employee_google_tokens', employeeId));
  if (snap.exists()) {
    const token = snap.data().accessToken;
    if (token && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
  }
  await setDoc(doc(db, 'employee_google_tokens', employeeId), { accessToken: null, expiresAt: 0 }, { merge: true });
  await setDoc(doc(db, 'employees', employeeId), { googleCalendarConnected: false }, { merge: true });
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

export async function listCalendars(employeeId: string): Promise<GoogleCalendarListEntry[]> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return [];
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).filter((c: GoogleCalendarListEntry) =>
    c.accessRole === 'owner' || c.accessRole === 'writer'
  );
}

export async function createCalendarEvent(employeeId: string, event: GoogleCalendarEvent, calendarId = 'primary'): Promise<string | null> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return null;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) return null;
  return (await res.json()).id || null;
}

export async function updateCalendarEvent(employeeId: string, eventId: string, event: GoogleCalendarEvent, calendarId = 'primary'): Promise<boolean> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return false;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  return res.ok;
}

export async function deleteCalendarEvent(employeeId: string, eventId: string, calendarId = 'primary'): Promise<boolean> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return false;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok || res.status === 404;
}

export function buildCalendarEvent(appointment: {
  date: string;
  duration: number;
  clientName: string;
  clientPhone?: string;
  serviceName?: string;
  notes?: string;
}): GoogleCalendarEvent {
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + appointment.duration * 60000);
  const descParts = [
    `Klient: ${appointment.clientName}`,
    appointment.clientPhone ? `Tel: ${appointment.clientPhone}` : '',
    appointment.serviceName ? `Zabieg: ${appointment.serviceName}` : '',
    `Czas trwania: ${appointment.duration} min`,
    appointment.notes ? `Uwagi: ${appointment.notes}` : '',
  ].filter(Boolean);
  return {
    summary: `${appointment.serviceName || 'Wizyta'} — ${appointment.clientName}`,
    description: descParts.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: 'Europe/Warsaw' },
    end: { dateTime: end.toISOString(), timeZone: 'Europe/Warsaw' },
  };
}
