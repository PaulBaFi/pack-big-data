import { useEffect, useState } from 'react';
import { readStore, writeStore, type Store } from '../data/repository';

export function useStore() {
  const [store, setStore] = useState<Store>(() => readStore());

  useEffect(() => {
    writeStore(store);
  }, [store]);

  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok && res.data) {
          setStore((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch((err) => console.warn('Using local cache/seed:', err));
  }, []);

  return [store, setStore] as const;
}
