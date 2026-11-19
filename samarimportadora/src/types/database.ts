export interface Articulo { CODIGO_PRODUCTO: string; NOMBRE: string | null; CATEGORIA: string | null; PRECIO_UNITARIO: number | null; COSTO_UNITARIO: number | null }
export interface Cliente { ID_CLIENTE: string; NOMBRE: string | null; APELLIDO: string | null; EDAD: number | null; ESTADO_CIVIL: string | null; RESIDENCIA: string | null; ORIGEN: string | null }
export interface ClienteBuey { ID_CLIENTE: string | null; NOMBRE: string | null; APELLIDO: string | null; EDAD: number | null; "LUGAR ORIGEN": string | null; "PREFERENCIA COLOR": string | null; "TIPO DE COMIDA": string | null; "ESTADO CIVIL": string | null; "CANTIDAD DE HIJOS": number | null; FIDELIDAD: string | null; COMPRABUEY: string | null }
export interface ProspectoClienteBuey { NRO_CLIENTE: number | null; ID_CLIENTE: string | null; NOMBRE: string | null; APELLIDO: string | null; EMAIL: string | null; EDAD: number | null; RESIDENCIA: string | null; ORIGEN: string | null; "PREFERENCIA COLOR": string | null; "TIPO DE COMIDA": string | null; "ESTADO CIVIL": string | null; "CANTIDAD DE HIJOS": number | null; FIDELIDAD: string | null }
export interface Region { REGION_ID: number; REGION: string | null }
export interface Provincia { PROVINCIA_ID: number; PROVINCIA_NOMBRE: string | null; REGION_ID: number | null }
export interface Comuna { COMUNA_ID: number; COMUNA_NOMBRE: string | null; PROVINCIA_ID: number | null }
export interface Sucursal { SUCURSAL_ID: number; NOMBRE_SUCURSAL: string | null; COMUNA_ID: number | null }
export interface Vendedor { ID_VENDEDOR: number; Nombre: string | null; Apellido: string | null; "TIPO_ CAPACITACION": string | null; HORAS_CAPACITACION: number | null }
export interface Venta { DOCUMENTO: string; FECHA: string | null; ID_CLIENTE: string | null; TIPO_DOCUMENTO: string | null; ID_VENDEDOR: number | null; TOTAL_NETO: number | null; IMPUESTO: number | null; TOTAL_DOCUMENTO: number | null; SUCURSAL_ID: number | null }
export interface DetalleVenta { DOCUMENTO: string | null; CODIGO_PRODUCTO: string | null; PRECIO_UNITARIO: number | null; CANTIDAD: number | null; TOTAL: number | null }
export type TableName = 'clientes' | 'articulos' | 'prospectos' | 'clientesBuey' | 'vendedores' | 'sucursales' | 'regiones' | 'provincias' | 'comunas' | 'ventas' | 'detalleVentas'
