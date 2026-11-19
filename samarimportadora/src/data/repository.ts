import { clientes } from './seed/clientes'; import { articulos } from './seed/articulos'; import { ventas } from './seed/ventas'; import { detalleVentas } from './seed/detalleVentas'; import { vendedores } from './seed/vendedores'; import { sucursales } from './seed/sucursales'; import { regiones, provincias, comunas } from './seed/geografia'; import { clientesBuey } from './seed/clientesBuey'; import { prospectos } from './seed/prospectos';
export const seedData={clientes,articulos,ventas,detalleVentas,vendedores,sucursales,regiones,provincias,comunas,clientesBuey,prospectos};
export type Store=typeof seedData;
const key='samar-importadora-store';
export function readStore(): Store { if(typeof window==='undefined') return seedData; const raw=localStorage.getItem(key); if(raw) try{return JSON.parse(raw)}catch{} localStorage.setItem(key,JSON.stringify(seedData)); return seedData; }
export function writeStore(store:Store){localStorage.setItem(key,JSON.stringify(store));}
export function resetStore(){localStorage.removeItem(key); return readStore();}
