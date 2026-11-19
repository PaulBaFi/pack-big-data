import { seed, type MockRow } from '../mock/generators';
const clone = (v: MockRow[]) => v.map((x) => ({ ...x }));
export async function list(table: string): Promise<MockRow[]> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`siga:${table}`);
    if (raw) return JSON.parse(raw);
  }
  return clone((seed as Record<string, MockRow[]>)[table] ?? []);
}
export async function save(table: string, rows: MockRow[]) {
  if (typeof window !== 'undefined') localStorage.setItem(`siga:${table}`, JSON.stringify(rows));
}
export async function create(table: string, row: MockRow) { const rows = await list(table); rows.unshift(row); await save(table, rows); return row; }
