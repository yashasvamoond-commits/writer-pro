/**
 * 🔔 Hearing-date reminders via Android local notifications.
 * Native (APK) only — in a browser this reports unavailable and the app
 * falls back to the on-screen agenda. Everything is offline & on-device.
 */
import { Capacitor } from '@capacitor/core';

export interface Reminder {
  id: number;
  title: string;
  body: string;
  at: Date;
}

export function remindersAvailable(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

function hashId(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 2147483000) + 1; // positive int32
}

/** Morning-of (09:00) + evening-before (20:00) reminders for one ISO date. */
export function remindersForDate(isoDate: string, label: string, detail: string): Reminder[] {
  const [y, m, d] = isoDate.split('-').map(Number);
  const out: Reminder[] = [];
  const dayOf = new Date(y, m - 1, d, 9, 0, 0);
  if (dayOf.getTime() > Date.now()) {
    out.push({ id: hashId(isoDate + label + 'am'), title: `⚖ ${label}`, body: `आज सुनवाई · Hearing TODAY: ${detail}`, at: dayOf });
  }
  const eveBefore = new Date(y, m - 1, d - 1, 20, 0, 0);
  if (eveBefore.getTime() > Date.now()) {
    out.push({ id: hashId(isoDate + label + 'pm'), title: `⚖ ${label} — कल / tomorrow`, body: `कल सुनवाई · Hearing tomorrow: ${detail}`, at: eveBefore });
  }
  return out;
}

/** Replace all pending reminders with `items`. Returns count scheduled, or -1 if unavailable/denied. */
export async function syncReminders(items: Reminder[]): Promise<number> {
  if (!remindersAvailable()) return -1;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return -1;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications });
    const future = items
      .filter((r) => r.at.getTime() > Date.now())
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, 120);
    if (future.length) {
      await LocalNotifications.schedule({
        notifications: future.map((r) => ({ id: r.id, title: r.title, body: r.body, at: r.at })),
      });
    }
    return future.length;
  } catch {
    return -1;
  }
}
