import type { Sucursal } from '../../types/database';
export const sucursales: Sucursal[] = Array.from({length:20},(_,i)=>({SUCURSAL_ID:i+1,NOMBRE_SUCURSAL:`Sucursal ${['Centro','Norte','Sur','Oriente'][i%4]} ${i+1}`,COMUNA_ID:(i%20)+1}));
