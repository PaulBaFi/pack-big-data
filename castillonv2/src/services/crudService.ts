import type { Database } from '../types/database';
import { saveData } from './storageService';

export const addRecord = (db: Database, table: keyof Database, record: any) => {
  (db[table] as any[]).push(record);
  saveData(db);
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, row: record }),
  }).catch((e) => console.warn('Error saving to cloud:', e));
};

export const nextId = (rows: any[], field: string) =>
  rows.reduce((m, r) => Math.max(m, Number(r[field]) || 0), 0) + 1;
