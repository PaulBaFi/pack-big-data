import type { DetalleVenta } from '../../types/database';
export const detalleVentas: DetalleVenta[] = Array.from({length:150},(_,i)=>{const p=(i%30)+1, cantidad=(i%4)+1, precio=8990+(p-1)*1375;return {DOCUMENTO:`VTA-${String((i%50)+1).padStart(4,'0')}`,CODIGO_PRODUCTO:`P-${String(p).padStart(3,'0')}`,PRECIO_UNITARIO:precio,CANTIDAD:cantidad,TOTAL:precio*cantidad}});
