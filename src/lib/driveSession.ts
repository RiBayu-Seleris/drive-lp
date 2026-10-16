import { stages } from '../experience/stages';

export type EntryMode = 'first-visit' | 'refresh' | 'normal';
export const sectionLabels: Record<string, string> = {
  incident: 'BERANDA', coverage: 'CEK PERLINDUNGAN', scan: 'SCAN KERUSAKAN',
  assessment: 'ANALISIS KERUSAKAN', unlock: 'HASIL ANALISIS', claim: 'KLAIM ASURANSI',
  services: 'BENGKEL & TOWING', resolution: 'KEMBALI DI JALAN',
  'page:services': 'PILIHAN LAYANAN', 'page:roles': 'UNTUK MITRA', 'page:perspective': 'TANYA JAWAB',
};
export function readSession(key: string) {
  try { return sessionStorage.getItem(`drive:${key}`); } catch { return null; }
}
export function writeSession(key: string, value: string) {
  try { sessionStorage.setItem(`drive:${key}`, value); } catch { /* Private / denied storage stays usable. */ }
}
function initialEntry(): { mode: EntryMode; section: string } {
  const params = new URLSearchParams(location.search);
  if (import.meta.env.DEV && params.get('splashReset') === '1') {
    try { sessionStorage.removeItem('drive:introSeen'); sessionStorage.removeItem('drive:lastSection'); } catch { /* optional */ }
  }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const seen = readSession('introSeen') === '1';
  // A fresh navigation also covers tabs opened with an opener (which copies sessionStorage).
  // Same-document navigation never remounts the application or calls this initializer again.
  let mode: EntryMode = seen && navigation?.type === 'reload' ? 'refresh' : 'first-visit';
  if (seen && navigation?.type === 'back_forward') mode = 'refresh';
  if (import.meta.env.DEV && params.get('loader') === 'refresh') mode = 'refresh';
  if (import.meta.env.DEV && params.get('splash') === '1') mode = 'first-visit';
  const saved = readSession('lastSection');
  return { mode, section: mode === 'refresh' && saved && Object.hasOwn(sectionLabels, saved) ? saved : stages[0].id };
}
// Exactly once per document, including under React StrictMode.
export const entry = initialEntry();
