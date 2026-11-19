export type EstadoCita = 'P' | 'C' | 'A' | 'X';
export type MovimientoTipo = 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA';

export interface PERSONA {
  IDPERSONA: number; NOMBRES: string; APELLIDOS: string; DOCUMENTO: string; TELEFONO: string; EMAIL: string;
}
export interface EMPRESA { IDEMPRESA: number; RUC: string; RAZON_SOCIAL: string; DIRECCION: string; TELEFONO: string; }
export interface CLIENTE { IDCLIENTE: number; IDPERSONA?: number; IDEMPRESA?: number; TIPO: 'Persona' | 'Empresa'; ACTIVO: boolean; }
export interface ESPECIE { IDESPECIE: number; NOMESPECIE: string; }
export interface RAZA { IDRAZA: number; IDESPECIE: number; NOMRAZA: string; }
export interface MASCOTA { IDMASCOTA: number; IDPERSONA: number; IDRAZA: number; NOMBRE: string; GENERO: 'Macho' | 'Hembra'; COLOR: string; FECHANACIMIENTO: string; PESO: number; }
export interface ESPECIALIDAD { IDESPECIALIDAD: number; NOMESPECIALIDAD: string; }
export interface EMPLEADO { IDEMPLEADO: number; IDPERSONA: number; IDESPECIALIDAD: number; CODEMPLEADO: string; CARGO: string; ACTIVO: boolean; }
export interface CITA { IDCITA: number; IDMASCOTA: number; IDEMPLEADO: number; FECHA: string; HORA: string; MOTIVO: string; ESTADO_CITA: EstadoCita; }
export interface FICHA_CLINICA { IDFICHA: number; IDMASCOTA: number; IDEMPLEADO: number; IDCITA?: number; MOTIVO_CONSULTA: string; SINTOMAS: string; TEMPERATURA: number; DIAGNOSTICO: string; TRATAMIENTO: string; FECHA: string; }
export interface ANALISIS { IDANALISIS: number; IDTIPO_ANALISIS: number; IDFICHA: number; FECHA: string; RESULTADO: string; OBSERVACION: string; }
export interface TIPO_ANALISIS { IDTIPO_ANALISIS: number; NOMBRE: string; }
export interface CATEGORIA { IDCATEGORIA: number; NOMCATEGORIA: string; }
export interface UNIDAD_MEDIDA { IDUNIDAD: number; NOMBRE: string; ABREVIATURA: string; }
export interface PRODUCTO { IDPRODUCTO: number; IDCATEGORIA: number; IDUNIDAD: number; CODIGO: string; NOMBRE: string; PRECIO_VENTA: number; COSTO: number; STOCK: number; STOCK_MINIMO: number; ACTIVO: boolean; }
export interface ALMACEN { IDALMACEN: number; NOMBRE: string; DIRECCION: string; }
export interface MOVIMIENTO_PRODUCTO { IDMOVIMIENTO: number; IDPRODUCTO: number; IDALMACEN: number; TIPO: MovimientoTipo; CANTIDAD: number; FECHA: string; MOTIVO: string; }
export interface AUDITORIA_STOCK { Idauditoria: number; Idproducto: number; FechaDeteccion: string; StockActual: number; StockCalculado: number; Diferencia: number; Observaciones: string; }
export interface COMPRA { IDCOMPRA: number; IDALMACEN: number; IDEMPRESA: number; FECHA: string; DOCUMENTO: string; TOTAL: number; ESTADO: 'BORRADOR' | 'CONFIRMADA'; }
export interface DETALLE_COMPRA { IDDETALLE_COMPRA: number; IDCOMPRA: number; IDPRODUCTO: number; CANTIDAD: number; PRECIO_UNITARIO: number; SUBTOTAL: number; }
export interface VENTA { IDVENTA: number; IDCLIENTE: number; FECHA: string; SUBTOTAL: number; DESCUENTO: number; IGV: number; TOTAL: number; ESTADO: 'PENDIENTE' | 'CONFIRMADA'; }
export interface DETALLE_VENTA { IDDETALLE_VENTA: number; IDVENTA: number; IDPRODUCTO: number; IDPROMOCION?: number; DESCRIPCION: string; CANTIDAD: number; PRECIO_UNITARIO: number; PRECIO_FINAL: number; SUBTOTAL: number; }
export interface BOLETA { IDBOLETA: number; IDVENTA: number; SERIE: string; NUMERO: number; }
export interface FACTURA { IDFACTURA: number; IDVENTA: number; SERIE: string; NUMERO: number; }
export interface PROMOCION { IDPROMOCION: number; NOMBRE: string; TIPO: 'PORCENTAJE' | 'MONTO'; VALOR: number; DESDE: string; HASTA: string; ACTIVA: boolean; }
export interface CAJA { IDCAJA: number; NOMBRE: string; DESCRIPCION: string; }
export interface APERTURA_CIERRE_CAJA { IDAPERTURA: number; IDCAJA: number; FECHA_APERTURA: string; MONTO_APERTURA: number; FECHA_CIERRE?: string; MONTO_CIERRE?: number; ESTADO: 'ABIERTA' | 'CERRADA'; }
export interface MOVIMIENTO_CAJA { IDMOVIMIENTO: number; IDAPERTURA: number; TIPO: 'INGRESO' | 'EGRESO'; MONTO: number; CONCEPTO: string; FECHA: string; }
export interface ARQUEO_CAJA { IDARQUEO: number; IDAPERTURA: number; FECHA_ARQUEO: string; TOTAL_SISTEMA: number; TOTAL_FISICO: number; DIFERENCIA: number; }
export interface DB {
  PERSONA: PERSONA[]; EMPRESA: EMPRESA[]; CLIENTE: CLIENTE[]; ESPECIE: ESPECIE[]; RAZA: RAZA[]; MASCOTA: MASCOTA[]; ESPECIALIDAD: ESPECIALIDAD[]; EMPLEADO: EMPLEADO[]; CITA: CITA[]; FICHA_CLINICA: FICHA_CLINICA[]; ANALISIS: ANALISIS[]; TIPO_ANALISIS: TIPO_ANALISIS[]; CATEGORIA: CATEGORIA[]; UNIDAD_MEDIDA: UNIDAD_MEDIDA[]; PRODUCTO: PRODUCTO[]; ALMACEN: ALMACEN[]; MOVIMIENTO_PRODUCTO: MOVIMIENTO_PRODUCTO[]; AUDITORIA_STOCK: AUDITORIA_STOCK[]; COMPRA: COMPRA[]; DETALLE_COMPRA: DETALLE_COMPRA[]; VENTA: VENTA[]; DETALLE_VENTA: DETALLE_VENTA[]; BOLETA: BOLETA[]; FACTURA: FACTURA[]; PROMOCION: PROMOCION[]; CAJA: CAJA[]; APERTURA_CIERRE_CAJA: APERTURA_CIERRE_CAJA[]; MOVIMIENTO_CAJA: MOVIMIENTO_CAJA[]; ARQUEO_CAJA: ARQUEO_CAJA[];
}
