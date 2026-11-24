import type { Database } from '../types/database';
import { saveData } from './storageService';

export const nextId = (rows: any[], field: string) =>
  (rows || []).reduce((m, r) => Math.max(m, Number(r[field]) || 0), 0) + 1;

export async function insertRecord(table: string, row: any): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, row }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.warn(`[Sync Error] Error insertando en ${table}:`, err);
    return false;
  }
}

export async function insertOperations(operations: { table: string; row: any }[]): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.warn('[Sync Error] Error en lote:', err);
    return false;
  }
}

export async function updateRecord(
  table: string,
  keyField: string,
  keyValue: any,
  updates: Record<string, any>
): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, keyField, keyValue, updates }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.warn(`[Sync Error] Error actualizando en ${table}:`, err);
    return false;
  }
}

export async function deleteRecord(
  table: string,
  keyField: string,
  keyValue: any
): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, keyField, keyValue }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.warn(`[Sync Error] Error eliminando en ${table}:`, err);
    return false;
  }
}

// Retrocompatibilidad
export const addRecord = (db: Database, table: keyof Database, record: any) => {
  if (!db[table]) (db as any)[table] = [];
  (db[table] as any[]).push(record);
  saveData(db);
  insertRecord(table, record);
};
