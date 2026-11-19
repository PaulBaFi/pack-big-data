import type { Vendedor } from '../../types/database';
export const vendedores: Vendedor[] = Array.from({length:20},(_,i)=>({ID_VENDEDOR:i+1,Nombre:['Laura','Marco','Elena','Bruno','Carolina'][i%5],Apellido:['Vega','Pinto','Navarro','Leiva'][i%4],'TIPO_ CAPACITACION':['Comercial','Producto','Servicio'][i%3],HORAS_CAPACITACION:12+(i%6)*4}));
