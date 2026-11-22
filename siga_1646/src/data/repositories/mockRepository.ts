import { seed, type MockRow } from '../mock/generators';

const clone = (v: MockRow[]) => v.map((x) => ({ ...x }));

export async function list(table: string): Promise<MockRow[]> {
  try {
    const res = await fetch(`/api/data?table=${encodeURIComponent(table)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`siga:${table}`, JSON.stringify(json.data));
        }
        return json.data;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch ${table} from API, falling back to local storage/seed:`, err);
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`siga:${table}`);
    if (raw) return JSON.parse(raw);
  }
  return clone((seed as Record<string, MockRow[]>)[table] ?? []);
}

export async function save(table: string, rows: MockRow[]) {
  if (typeof window !== 'undefined') localStorage.setItem(`siga:${table}`, JSON.stringify(rows));
}

export async function create(table: string, row: MockRow) {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, row }),
    });
    if (res.ok) {
      const json = await res.json();
      const createdRow = json.inserted || row;
      const rows = await list(table);
      rows.unshift(createdRow);
      await save(table, rows);
      return createdRow;
    }
  } catch (err) {
    console.warn(`Failed to post new row to ${table}, saving locally:`, err);
  }

  const rows = await list(table);
  rows.unshift(row);
  await save(table, rows);
  return row;
}
