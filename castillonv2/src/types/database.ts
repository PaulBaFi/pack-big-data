export type Estado = string;
export interface PERSONA { IDPERSONA:number; IDDISTRITO:number; NOMBRES:string; APEPATERNO:string; APEMATERNO:string; EST_CIVIL:string; DNI:string; DIRECCION:string; CELULAR:string; FECNAC:string; CORREO:string; ESTADO:Estado }
export interface CLIENTE { IDCLIENTE:number; IDPERSONA:number|null; IDEMPRESA:number|null; ESTADO:Estado }
export interface EMPRESA { IDEMPRESA:number; RUC:string; RAZON_SOCIAL:string; DIRECCION:string; TELEFONO:string; ESTADO:Estado }
export interface CATEGORIA { IDCATEGORIA:number; NOMCATEGORIA:string; ESTADO:Estado }
export interface PRODUCTO { IDPRODUCTO:number; IDCATEGORIA:number; NOMPRODUCTO:string; DESCRIPCION:string; PRECIO:number; MARCA:string; ESTADO:Estado }
export interface MESAS { IDMESA:number; NUMPISO:number; NUNMESA:number; ESTADO:Estado }
export interface PEDIDOS { IDPEDIDO:number; IDMESA:number; FECHA:string; ESTADO:Estado }
export interface DETALLE_PEDIDO { IDDETALLE_PEDIDO:number; IDPEDIDO:number; IDPRODUCTO:number; IDAREA:number|null; IDUSUARIO:number|null; CANTIDAD:number; PRECIO:number; ESTADO:Estado }
export interface AREA { IDAREA:number; NOMAREA:string; ESTADO:Estado }
export interface VENTAS { IDVENTAS:number; IDCLIENTE:number; IDMETODO_PAGO:number; IDPEDIDO:number; IDUSUARIO:number; FECHAVENTA:string; DOCUMENTO:string; MONTOTOTAL:number; DESCUENTO:number; SUBTOTOTAL:number; IGV:number; TOTALPAGAR:number; ESTADO:Estado }
export interface METODO_PAGO { IDMETODO_PAGO:number; NOMMETODO:string; ESTADO:Estado }
export interface BOLETA { IDBOLETA:number; IDVENTAS:number; FECHAEMISION:string; NUMERO:string; SERIE:string; ESTADO:Estado }
export interface FACTURA { IDFACTURA:number; IDVENTAS:number; FECHAEMISION:string; NUMERO:string; SERIE:string; ESTADO:Estado }
export interface DEUDA_GENERADA { IDDEUDA_GENERADA:number; IDVENTAS:number; DESCRIPCION:string; ESTADO:Estado }
export interface INGRESO { IDINGRESO:number; IDDEUDA_GENERADA:number; IDBANCO:number; FECHAPAGO:string; ESTADO:Estado }
export interface BANCO { IDBANCO:number; NOMBANCO:string; ESTADO:Estado }
export interface EGRESO { IDEGRESO:number; IDVENTAS:number; NUMRECIBO:string; DETALLE:string; TOTAL:number; ESTADO:Estado }
export interface EMPLEADO { IDEMPLEADO:number; IDPERSONA:number; IDCONTRATO:number; IDCARGO:number; SALARIO:number; TURNO:string; ESTADO:Estado }
export interface CARGO { IDCARGO:number; NOMCARGO:string; ESTADO:Estado }
export interface CONTRATO { IDCONTRATO:number; NOMCONTRATO:string; ESTADO:Estado }
export interface USUARIO { IDUSUARIO:number; IDEMPLEADO:number; IDTIPO_USUARIO:number; LOGEO:string; CLAVE:string; ESTADO:Estado }
export interface TIPO_USUARIO { IDTIPO_USUARIO:number; NOMUSUARIO:string; ESTADO:Estado }
export interface DEPARTAMENTO { IDDepartamento:number; NOMDEPARTAMENTO:string; ESTADO:Estado }
export interface PROVINCIA { IDPROVINCIA:number; IDDEPARTAMENTO:number; NOMPROVINCIA:string; ESTADO:Estado }
export interface DISTRITO { IDDISTRITO:number; IDPROVINCIA:number; NOMDISTRITO:string; ESTADO:Estado }
export interface Database { PERSONA:PERSONA[]; CLIENTE:CLIENTE[]; EMPRESA:EMPRESA[]; CATEGORIA:CATEGORIA[]; PRODUCTO:PRODUCTO[]; MESAS:MESAS[]; PEDIDOS:PEDIDOS[]; DETALLE_PEDIDO:DETALLE_PEDIDO[]; AREA:AREA[]; VENTAS:VENTAS[]; METODO_PAGO:METODO_PAGO[]; BOLETA:BOLETA[]; FACTURA:FACTURA[]; DEUDA_GENERADA:DEUDA_GENERADA[]; INGRESO:INGRESO[]; BANCO:BANCO[]; EGRESO:EGRESO[]; EMPLEADO:EMPLEADO[]; CARGO:CARGO[]; CONTRATO:CONTRATO[]; USUARIO:USUARIO[]; TIPO_USUARIO:TIPO_USUARIO[]; DEPARTAMENTO:DEPARTAMENTO[]; PROVINCIA:PROVINCIA[]; DISTRITO:DISTRITO[] }
