import { useCallback, useEffect, useState } from 'react';
import type { Articulo, Cliente, ClienteBuey, Comuna, DetalleVenta, Provincia, ProspectoClienteBuey, Region, Sucursal, Vendedor, Venta } from '../types/database';

export interface Store {
  clientes: Cliente[];
  articulos: Articulo[];
  ventas: Venta[];
  detalleVentas: DetalleVenta[];
  vendedores: Vendedor[];
  sucursales: Sucursal[];
  regiones: Region[];
  provincias: Provincia[];
  comunas: Comuna[];
  clientesBuey: ClienteBuey[];
  prospectos: ProspectoClienteBuey[];
}

const emptyStore: Store = {
  clientes: [],
  articulos: [],
  ventas: [],
  detalleVentas: [],
  vendedores: [],
  sucursales: [],
  regiones: [],
  provincias: [],
  comunas: [],
  clientesBuey: [],
  prospectos: []
};

const LOCAL_STORAGE_KEY = 'samar_store_cache_v1';
let sharedStore: Store = emptyStore;
let sharedLoaded = false;
let inFlightPromise: Promise<Store> | null = null;
const listeners = new Set<(s: Store) => void>();

function updateSharedStore(next: Store) {
  sharedStore = next;
  sharedLoaded = true;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  listeners.forEach((listener) => listener(next));
}

function loadInitialStore(): Store {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.clientes) && parsed.clientes.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return emptyStore;
}

async function fetchAllStore(): Promise<Store> {
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = (async () => {
    try {
      const response = await fetch('/api/data?table=all');
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error || 'PostgreSQL no está disponible');
      }

      const d = body.data;
      const next: Store = {
        clientes: d.clientes ?? [],
        articulos: d.articulos ?? [],
        vendedores: d.vendedores ?? [],
        sucursales: d.sucursales ?? [],
        regiones: d.regiones ?? [],
        provincias: d.provincias ?? [],
        comunas: d.comunas ?? [],
        clientesBuey: d.clientesBuey ?? [],
        prospectos: d.prospectos ?? [],
        ventas: d.ventas ?? [],
        detalleVentas: d.detalleVentas ?? [],
      };

      updateSharedStore(next);
      return next;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function useStore() {
  const [store, setLocalStore] = useState<Store>(() => {
    if (sharedLoaded) return sharedStore;
    const initial = loadInitialStore();
    if (initial.clientes.length > 0) {
      sharedStore = initial;
      sharedLoaded = true;
    }
    return sharedStore;
  });

  const [loading, setLoading] = useState(!sharedLoaded);
  const [error, setError] = useState('');

  useEffect(() => {
    const listener = (newStore: Store) => {
      setLocalStore(newStore);
      setLoading(false);
      setError('');
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await fetchAllStore();
      setLocalStore(next);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'No se pudieron cargar los datos';
      setError(msg);
      // Retener cache para no dejar la pantalla en blanco
      if (sharedStore.clientes.length === 0) {
        const cached = loadInitialStore();
        if (cached.clientes.length > 0) {
          sharedStore = cached;
          sharedLoaded = true;
          setLocalStore(cached);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sharedLoaded) {
      void reload();
    } else {
      setLoading(false);
    }
  }, [reload]);

  const setStore = useCallback((updater: Store | ((prev: Store) => Store)) => {
    const next = typeof updater === 'function' ? updater(sharedStore) : updater;
    updateSharedStore(next);
  }, []);

  return [store, setStore, { loading, error, reload }] as const;
}
