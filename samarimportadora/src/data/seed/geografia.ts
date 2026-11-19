import type { Region, Provincia, Comuna } from '../../types/database';
export const regiones: Region[] = Array.from({length:20},(_,i)=>({REGION_ID:i+1,REGION:`Región Demo ${i+1}`}));
export const provincias: Provincia[] = Array.from({length:20},(_,i)=>({PROVINCIA_ID:i+1,PROVINCIA_NOMBRE:`Provincia Demo ${i+1}`,REGION_ID:i+1}));
export const comunas: Comuna[] = Array.from({length:30},(_,i)=>({COMUNA_ID:i+1,COMUNA_NOMBRE:`Comuna Demo ${i+1}`,PROVINCIA_ID:(i%20)+1}));
