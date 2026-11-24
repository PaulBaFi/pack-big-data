import { useCallback, useEffect, useState } from 'react';
import type { Articulo, Cliente, ClienteBuey, Comuna, DetalleVenta, Provincia, ProspectoClienteBuey, Region, Sucursal, Vendedor, Venta } from '../types/database';
export interface Store { clientes: Cliente[]; articulos: Articulo[]; ventas: Venta[]; detalleVentas: DetalleVenta[]; vendedores: Vendedor[]; sucursales: Sucursal[]; regiones: Region[]; provincias: Provincia[]; comunas: Comuna[]; clientesBuey: ClienteBuey[]; prospectos: ProspectoClienteBuey[]; }
const emptyStore: Store = { clientes: [], articulos: [], ventas: [], detalleVentas: [], vendedores: [], sucursales: [], regiones: [], provincias: [], comunas: [], clientesBuey: [], prospectos: [] };
const entities = ['clientes', 'articulos', 'vendedores', 'sucursales', 'regiones', 'provincias', 'comunas', 'clientesBuey', 'prospectos'] as const;
export function useStore() {
  const [store, setStore] = useState<Store>(emptyStore), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const responses = await Promise.all([...entities.map((table) => fetch(`/api/data?table=${table}&pageSize=100`)), fetch('/api/ventas?pageSize=100')]);
      const payloads = await Promise.all(responses.map((response) => response.json().then((body) => ({ response, body }))));
      const failed = payloads.find(({ response, body }) => !response.ok || !body.ok);
      if (failed) throw new Error(failed.body.error || 'PostgreSQL no está disponible');
      const next: Store = { ...emptyStore };
      entities.forEach((name, index) => { (next as any)[name] = payloads[index].body.data; });
      next.ventas = payloads[entities.length].body.data; next.detalleVentas = payloads[entities.length].body.details ?? [];
      setStore(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos'); setStore(emptyStore); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return [store, setStore, { loading, error, reload }] as const;
}
