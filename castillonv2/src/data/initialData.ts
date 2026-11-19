import type { Database } from '../types/database';
const names=['María','Jorge','Lucía','Carlos','Ana','Diego','Sofía','Luis','Camila','Mateo'];
const last=['Castillo','Rojas','Quispe','Torres','Flores','Mendoza','Vega','Paredes','Salazar','Núñez'];
const today=(offset:number)=>{const d=new Date(2026,3-(offset%4),1+(offset%25));return d.toISOString().slice(0,10)};

export function createInitialData():Database {
 const PERSONA=Array.from({length:30},(_,i)=>({IDPERSONA:i+1,IDDISTRITO:(i%40)+1,NOMBRES:names[i%10],APEPATERNO:last[i%10],APEMATERNO:last[(i+3)%10],EST_CIVIL:i%2?'S':'C',DNI:`${70000000+i}` ,DIRECCION:`Jr. Los Olivos ${100+i}`,CELULAR:`9876543${String(i).padStart(2,'0')}`,FECNAC:`198${i%10}-0${(i%9)+1}-15`,CORREO:`persona${i+1}@demo.pe`,ESTADO:'A'}));
 const EMPRESA=Array.from({length:20},(_,i)=>({IDEMPRESA:i+1,RUC:`20600000${String(i+1).padStart(3,'0')}`,RAZON_SOCIAL:`Sabores del Valle ${i+1} SAC`,DIRECCION:`Av. Gastronomía ${i+1}`,TELEFONO:`0160000${String(i).padStart(2,'0')}`,ESTADO:'A'}));
 const CLIENTE=Array.from({length:25},(_,i)=>({IDCLIENTE:i+1,IDPERSONA:i<18?i+1:null,IDEMPRESA:i>=18?i-17:null,ESTADO:'A'}));
 const CATEGORIA=Array.from({length:20},(_,i)=>({IDCATEGORIA:i+1,NOMCATEGORIA:['Entradas','Fondos','Bebidas','Postres','Parrillas'][i%5]+` ${i>4?Math.floor(i/5):''}`.trim(),ESTADO:'A'}));
 const PRODUCTO=Array.from({length:30},(_,i)=>({IDPRODUCTO:i+1,IDCATEGORIA:i%20+1,NOMPRODUCTO:['Ceviche clásico','Lomo saltado','Ají de gallina','Chicha morada','Suspiro limeño','Picarones'][i%6]+` ${i+1}`,DESCRIPCION:'Preparación de la casa',PRECIO:12+(i%10)*3.5,MARCA:'Castillón',ESTADO:'A'}));
 const MESAS=Array.from({length:20},(_,i)=>({IDMESA:i+1,NUMPISO:Math.floor(i/10)+1,NUNMESA:(i%10)+1,ESTADO:i%7===0?'O':'D'}));
 const AREA=Array.from({length:20},(_,i)=>({IDAREA:i+1,NOMAREA:['Cocina','Barra','Parrilla','Postres'][i%4],ESTADO:'A'}));
 const PEDIDOS=Array.from({length:30},(_,i)=>({IDPEDIDO:i+1,IDMESA:i%20+1,FECHA:today(i),ESTADO:['C','P','F'][i%3]}));
 const DETALLE_PEDIDO=Array.from({length:60},(_,i)=>({IDDETALLE_PEDIDO:i+1,IDPEDIDO:i%30+1,IDPRODUCTO:i%30+1,IDAREA:i%20+1,IDUSUARIO:i%20+1,CANTIDAD:i%3+1,PRECIO:12+(i%10)*3.5,ESTADO:'A'}));
 const METODO_PAGO=Array.from({length:20},(_,i)=>({IDMETODO_PAGO:i+1,NOMMETODO:['Yape','Efectivo','Visa','Mastercard','Transferencia'][i%5],ESTADO:'A'}));
 const VENTAS=Array.from({length:30},(_,i)=>{const sub=DETALLE_PEDIDO.filter(d=>d.IDPEDIDO===i+1).reduce((a,d)=>a+d.CANTIDAD*d.PRECIO,0);const desc=i%4===0?5:0;return {IDVENTAS:i+1,IDCLIENTE:i%25+1,IDMETODO_PAGO:i%20+1,IDPEDIDO:i+1,IDUSUARIO:i%20+1,FECHAVENTA:today(i),DOCUMENTO:i%2?'B':'F',MONTOTOTAL:sub,DESCUENTO:desc,SUBTOTOTAL:sub-desc,IGV:Number(((sub-desc)*.18).toFixed(2)),TOTALPAGAR:Number(((sub-desc)*1.18).toFixed(2)),ESTADO:'A'}}); 
 const BOLETA=Array.from({length:20},(_,i)=>({IDBOLETA:i+1,IDVENTAS:i+1,FECHAEMISION:today(i),NUMERO:String(i+1).padStart(4,'0'),SERIE:'B001',ESTADO:'A'}));
 const FACTURA=Array.from({length:20},(_,i)=>({IDFACTURA:i+1,IDVENTAS:i+11,FECHAEMISION:today(i),NUMERO:String(i+1).padStart(4,'0'),SERIE:'F001',ESTADO:'A'}));
 const DEUDA_GENERADA=Array.from({length:25},(_,i)=>({IDDEUDA_GENERADA:i+1,IDVENTAS:i+1,DESCRIPCION:'Venta registrada pendiente de conciliación',ESTADO:'A'}));
 const INGRESO=Array.from({length:25},(_,i)=>({IDINGRESO:i+1,IDDEUDA_GENERADA:i+1,IDBANCO:i%20+1,FECHAPAGO:today(i),ESTADO:'A'}));
 const BANCO=Array.from({length:20},(_,i)=>({IDBANCO:i+1,NOMBANCO:['BCP','BBVA','Interbank','Scotiabank'][i%4],ESTADO:'A'}));
 const EGRESO=Array.from({length:20},(_,i)=>({IDEGRESO:i+1,IDVENTAS:i+1,NUMRECIBO:`R-${String(i+1).padStart(6,'0')}`,DETALLE:'Compra de insumos',TOTAL:45+(i%8)*10,ESTADO:'A'}));
 const CARGO=Array.from({length:20},(_,i)=>({IDCARGO:i+1,NOMCARGO:['Cocinero','Mozo','Cajero','Administrador'][i%4],ESTADO:'A'})), CONTRATO=Array.from({length:20},(_,i)=>({IDCONTRATO:i+1,NOMCONTRATO:['Planilla','Tiempo parcial','Temporal'][i%3],ESTADO:'A'})), TIPO_USUARIO=Array.from({length:20},(_,i)=>({IDTIPO_USUARIO:i+1,NOMUSUARIO:['Administrador','Cajero','Mozo','Supervisor'][i%4],ESTADO:'A'}));
 const EMPLEADO=Array.from({length:20},(_,i)=>({IDEMPLEADO:i+1,IDPERSONA:i+1,IDCONTRATO:i+1,IDCARGO:i+1,SALARIO:1200+(i%5)*250,TURNO:i%2?'Tarde':'Mañana',ESTADO:'A'}));
 const USUARIO=Array.from({length:20},(_,i)=>({IDUSUARIO:i+1,IDEMPLEADO:i+1,IDTIPO_USUARIO:i+1,LOGEO:`usuario${i+1}`,CLAVE:'[no almacenada]',ESTADO:'A'}));
 const DEPARTAMENTO=Array.from({length:20},(_,i)=>({IDDepartamento:i+1,NOMDEPARTAMENTO:['Lima','Cusco','Arequipa','Piura','La Libertad'][i%5]+` ${i+1}`,ESTADO:'A'}));
 const PROVINCIA=Array.from({length:30},(_,i)=>({IDPROVINCIA:i+1,IDDEPARTAMENTO:i%20+1,NOMPROVINCIA:`Provincia Demo ${i+1}`,ESTADO:'A'}));
 const DISTRITO=Array.from({length:40},(_,i)=>({IDDISTRITO:i+1,IDPROVINCIA:i%30+1,NOMDISTRITO:`Distrito Demo ${i+1}`,ESTADO:'A'}));
 return {PERSONA,CLIENTE,EMPRESA,CATEGORIA,PRODUCTO,MESAS,PEDIDOS,DETALLE_PEDIDO,AREA,VENTAS,METODO_PAGO,BOLETA,FACTURA,DEUDA_GENERADA,INGRESO,BANCO,EGRESO,EMPLEADO,CARGO,CONTRATO,USUARIO,TIPO_USUARIO,DEPARTAMENTO,PROVINCIA,DISTRITO};
}
