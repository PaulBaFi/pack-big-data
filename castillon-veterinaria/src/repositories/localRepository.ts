import type { DB } from '@/types/domain';
import { loadDB, nextId, saveDB } from '@/services/storage';
import { seedDB } from '@/data/seed';

/** Adaptador pequeño para que las vistas no dependan del mecanismo de persistencia. */
export class LocalRepository<K extends keyof DB> {
  constructor(private readonly table: K, private readonly idField: keyof DB[K][number]) {}
  list(): DB[K] { return loadDB(seedDB)[this.table]; }
  getById(id: number): DB[K][number] | undefined { return this.list().find(item => Number(item[this.idField]) === id); }
  create(value: Omit<DB[K][number], string> & Partial<DB[K][number]>): DB[K][number] {
    const db = loadDB(seedDB);
    const item = { ...value, [this.idField]: nextId(db[this.table], this.idField) } as DB[K][number];
    db[this.table] = [...db[this.table], item] as DB[K];
    saveDB(db);
    return item;
  }
  update(id: number, patch: Partial<DB[K][number]>): DB[K][number] {
    const db = loadDB(seedDB);
    const current = db[this.table].find(item => Number(item[this.idField]) === id);
    if (!current) throw new Error(`Registro ${id} no encontrado en ${String(this.table)}`);
    const updated = { ...current, ...patch } as DB[K][number];
    db[this.table] = db[this.table].map(item => Number(item[this.idField]) === id ? updated : item) as DB[K];
    saveDB(db);
    return updated;
  }
}
