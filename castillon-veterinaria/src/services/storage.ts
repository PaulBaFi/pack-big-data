import type { DB } from '@/types/domain';
export const STORAGE_KEY = 'castillon-veterinaria-db-v1';
export function loadDB(seed: () => DB): DB {
  if (typeof window === 'undefined') return seed();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) { const value = seed(); window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return value; }
  try { return JSON.parse(raw) as DB; } catch { const value = seed(); window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return value; }
}
export function saveDB(db: DB): void { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
export function nextId<T extends Record<string, unknown>>(items: T[], key: keyof T): number {
  return items.reduce((max, item) => Math.max(max, Number(item[key]) || 0), 0) + 1;
}
