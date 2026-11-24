import type { APIRoute } from 'astro';
import { getPool, closePool } from '../../lib/db';

export const prerender = false;
export const maxDuration = 30;

const TABLES = [
  'PERSONA', 'EMPRESA', 'CLIENTE', 'ESPECIE', 'RAZA', 'MASCOTA',
  'ESPECIALIDAD', 'EMPLEADO', 'CITA', 'FICHA_CLINICA', 'ANALISIS',
  'TIPO_ANALISIS', 'CATEGORIA', 'UNIDAD_MEDIDA', 'PRODUCTO', 'ALMACEN',
  'MOVIMIENTO_PRODUCTO', 'AUDITORIA_STOCK', 'COMPRA', 'DETALLE_COMPRA',
  'VENTA', 'DETALLE_VENTA', 'BOLETA', 'FACTURA', 'PROMOCION', 'CAJA',
  'APERTURA_CIERRE_CAJA', 'MOVIMIENTO_CAJA', 'ARQUEO_CAJA'
];

const PET_NAMES = [
  'Luna', 'Max', 'Nala', 'Toby', 'Milo', 'Kira', 'Rocky', 'Coco',
  'Simba', 'Maya', 'Bruno', 'Sasha', 'Thor', 'Bella', 'Lucas', 'Zeus',
  'Chester', 'Pelusa', 'Boby', 'Princesa'
];

export function transformRow(table: string, r: any): any {
  if (!r) return r;
  switch (table) {
    case 'PERSONA':
      return {
        ...r,
        IDPERSONA: Number(r.IDPERSONA),
        NOMBRES: r.NOMBRES ?? r.NOMBRE ?? '—',
        APELLIDOS: r.APELLIDOS ?? ((`${r.APE_PATERNO || ''} ${r.APE_MATERNO || ''}`).trim() || '—'),
        DOCUMENTO: r.DOCUMENTO ?? r.DNI ?? '—',
        TELEFONO: r.TELEFONO ?? r.CELULAR ?? '—',
        EMAIL: r.EMAIL ?? r.CORREO ?? '—',
      };
    case 'CLIENTE':
      return {
        ...r,
        IDCLIENTE: Number(r.IDCLIENTE),
        IDPERSONA: r.IDPERSONA ? Number(r.IDPERSONA) : undefined,
        IDEMPRESA: r.IDEMPRESA ? Number(r.IDEMPRESA) : undefined,
        TIPO: r.TIPO ?? (r.IDPERSONA ? 'Persona' : 'Empresa'),
        ACTIVO: r.ACTIVO !== undefined ? Boolean(r.ACTIVO) : (r.ESTADO === '1' || r.ESTADO === 'A'),
      };
    case 'MASCOTA': {
      const petId = Number(r.IDMASCOTA) || 1;
      const petName = r.NOMBRE ?? `${PET_NAMES[(petId - 1) % PET_NAMES.length]} #${petId}`;
      let birth = '2023-01-01';
      if (r.FECHANACIMIENTO) {
        birth = String(r.FECHANACIMIENTO).slice(0, 10);
      } else if (r.FECHNAC) {
        try {
          birth = new Date(r.FECHNAC).toISOString().slice(0, 10);
        } catch {
          birth = String(r.FECHNAC).slice(0, 10);
        }
      }
      return {
        ...r,
        IDMASCOTA: petId,
        IDPERSONA: Number(r.IDPERSONA),
        IDRAZA: Number(r.IDRAZA),
        NOMBRE: petName,
        GENERO: r.GENERO === 'M' || r.GENERO === 'Macho' ? 'Macho' : 'Hembra',
        COLOR: r.COLOR ?? 'Marrón',
        FECHANACIMIENTO: birth,
        PESO: Number(r.PESO) || 0,
      };
    }
    case 'PRODUCTO':
      return {
        ...r,
        IDPRODUCTO: Number(r.IDPRODUCTO),
        IDCATEGORIA: Number(r.IDCATEGORIA) || 1,
        IDUNIDAD: Number(r.IDUNIDAD_MEDIDA ?? r.IDUNIDAD) || 1,
        CODIGO: r.CODIGO ?? `PROD-${String(r.IDPRODUCTO).padStart(3, '0')}`,
        NOMBRE: r.NOMBRE ?? r.NOMPRODUCTO ?? 'Producto veterinario',
        PRECIO_VENTA: Number(r.PRECIO_VENTA ?? r.PRECIO_UNITARIO) || 0,
        COSTO: Number(r.COSTO) || Math.round((Number(r.PRECIO_UNITARIO) || 0) * 0.7),
        STOCK: Number(r.STOCK ?? r.STOCK_ACTUAL) || 0,
        STOCK_MINIMO: Number(r.STOCK_MINIMO) || 15,
        ACTIVO: r.ACTIVO !== undefined ? Boolean(r.ACTIVO) : (r.ESTADO === '1'),
      };
    case 'VENTA': {
      let saleDate = '';
      if (r.FECHA) {
        saleDate = String(r.FECHA).slice(0, 10);
      } else if (r.FECH_VENTA) {
        try {
          saleDate = new Date(r.FECH_VENTA).toISOString().slice(0, 10);
        } catch {
          saleDate = String(r.FECH_VENTA).slice(0, 10);
        }
      }
      return {
        ...r,
        IDVENTA: Number(r.IDVENTA),
        IDCLIENTE: Number(r.IDCLIENTE),
        FECHA: saleDate,
        SUBTOTAL: Number(r.SUBTOTAL) || 0,
        DESCUENTO: Number(r.DESCUENTO) || 0,
        IGV: Number(r.IGV) || 0,
        TOTAL: Number(r.TOTALAAPAGAR ?? r.TOTAL) || 0,
        ESTADO: r.ESTADO === '1' || r.ESTADO === 'CONFIRMADA' ? 'CONFIRMADA' : 'PENDIENTE',
      };
    }
    case 'CITA': {
      let apptDate = '';
      if (r.FECHA) {
        try {
          apptDate = new Date(r.FECHA).toISOString().slice(0, 10);
        } catch {
          apptDate = String(r.FECHA).slice(0, 10);
        }
      }
      return {
        ...r,
        IDCITA: Number(r.IDCITA),
        IDMASCOTA: Number(r.IDMASCOTA),
        IDEMPLEADO: Number(r.IDEMPLEADO),
        FECHA: apptDate,
        HORA: r.HORA ? String(r.HORA).slice(0, 5) : '09:00',
        MOTIVO: r.MOTIVO || 'Consulta general',
        ESTADO_CITA: r.ESTADO_CITA || 'P',
      };
    }
    case 'FICHA_CLINICA': {
      let fDate = '';
      if (r.FECHA) {
        fDate = String(r.FECHA).slice(0, 10);
      } else if (r.FECCRE) {
        try {
          fDate = new Date(r.FECCRE).toISOString().slice(0, 10);
        } catch {
          fDate = String(r.FECCRE).slice(0, 10);
        }
      }
      return {
        ...r,
        IDFICHA: Number(r.IDFICHA),
        IDMASCOTA: Number(r.IDMASCOTA),
        IDEMPLEADO: Number(r.IDEMPLEADO),
        IDCITA: r.IDCITA ? Number(r.IDCITA) : undefined,
        MOTIVO_CONSULTA: r.MOTIVO_CONSULTA || '',
        SINTOMAS: r.SINTOMAS || '',
        TEMPERATURA: Number(r.TEMPERATURA) || 38,
        DIAGNOSTICO: r.DIAGNOSTICO || '',
        TRATAMIENTO: r.TRATAMIENTO || '',
        FECHA: fDate,
      };
    }
    case 'EMPLEADO':
      return {
        ...r,
        IDEMPLEADO: Number(r.IDEMPLEADO),
        IDPERSONA: Number(r.IDPERSONA),
        IDESPECIALIDAD: Number(r.IDESPECIALIDAD) || 1,
        CODEMPLEADO: r.CODEMPLEADO || `VET-${String(r.IDEMPLEADO).padStart(3, '0')}`,
        CARGO: r.CARGO || 'Médico veterinario',
        ACTIVO: r.ACTIVO !== undefined ? Boolean(r.ACTIVO) : (r.ESTADO === '1'),
      };
    case 'UNIDAD_MEDIDA':
      return {
        ...r,
        IDUNIDAD: Number(r.IDUNIDAD_MEDIDA ?? r.IDUNIDAD),
        NOMBRE: r.NOMBRE ?? r.NOMUNIDAD_MEDIDA ?? 'Unidad',
        ABREVIATURA: r.ABREVIATURA ?? r.NOMUNIDAD_MEDIDA ?? 'und',
      };
    case 'PROMOCION':
      return {
        ...r,
        IDPROMOCION: Number(r.IDPROMOCION),
        NOMBRE: r.NOMBRE ?? r.NOMPROMOCION ?? 'Promoción bienestar',
        TIPO: r.TIPO ?? (Number(r.VALOR) > 100 ? 'MONTO' : 'PORCENTAJE'),
        VALOR: Number(r.VALOR) || 0,
        DESDE: r.DESDE ?? (r.FECHAINICIO ? new Date(r.FECHAINICIO).toISOString().slice(0, 10) : ''),
        HASTA: r.HASTA ?? (r.FECHAFIN ? new Date(r.FECHAFIN).toISOString().slice(0, 10) : ''),
        ACTIVA: r.ACTIVA !== undefined ? Boolean(r.ACTIVA) : (r.ESTADO === '1'),
      };
    case 'APERTURA_CIERRE_CAJA':
      return {
        ...r,
        IDAPERTURA: Number(r.IDAPERTURA),
        IDCAJA: Number(r.IDCAJA),
        FECHA_APERTURA: r.FECHA_APERTURA ? new Date(r.FECHA_APERTURA).toISOString().slice(0, 10) : '',
        MONTO_APERTURA: Number(r.MONTO_APERTURA) || 0,
        FECHA_CIERRE: r.FECHA_CIERRE ? new Date(r.FECHA_CIERRE).toISOString().slice(0, 10) : undefined,
        MONTO_CIERRE: r.MONTO_CIERRE ? Number(r.MONTO_CIERRE) : undefined,
        ESTADO: r.ESTADO === '1' || r.ESTADO === 'ABIERTA' ? 'ABIERTA' : 'CERRADA',
      };
    case 'COMPRA':
      return {
        ...r,
        IDCOMPRA: Number(r.IDCOMPRA),
        IDALMACEN: Number(r.IDALMACEN) || 1,
        IDEMPRESA: Number(r.IDEMPRESA) || 1,
        FECHA: r.FECHA ? new Date(r.FECHA).toISOString().slice(0, 10) : '',
        DOCUMENTO: r.DOCUMENTO || `F001-${1000 + Number(r.IDCOMPRA)}`,
        TOTAL: Number(r.TOTAL) || 0,
        ESTADO: r.ESTADO === '1' || r.ESTADO === 'CONFIRMADA' ? 'CONFIRMADA' : 'BORRADOR',
      };
    default:
      return r;
  }
}

function toDbRow(table: string, row: Record<string, any>): Record<string, any> {
  const dbRow = { ...row };
  if (table === 'PRODUCTO') {
    if (row.NOMBRE && !row.NOMPRODUCTO) dbRow.NOMPRODUCTO = row.NOMBRE;
    if (row.STOCK !== undefined && !row.STOCK_ACTUAL) dbRow.STOCK_ACTUAL = row.STOCK;
    if (row.PRECIO_VENTA !== undefined && !row.PRECIO_UNITARIO) dbRow.PRECIO_UNITARIO = row.PRECIO_VENTA;
    if (row.IDUNIDAD && !row.IDUNIDAD_MEDIDA) dbRow.IDUNIDAD_MEDIDA = row.IDUNIDAD;
    delete dbRow.NOMBRE;
    delete dbRow.STOCK;
    delete dbRow.STOCK_MINIMO;
    delete dbRow.PRECIO_VENTA;
    delete dbRow.COSTO;
    delete dbRow.IDUNIDAD;
    delete dbRow.CODIGO;
    delete dbRow.ACTIVO;
  } else if (table === 'MASCOTA') {
    if (row.GENERO) dbRow.GENERO = row.GENERO === 'Hembra' || row.GENERO === 'H' ? 'H' : 'M';
    if (row.FECHANACIMIENTO && !row.FECHNAC) dbRow.FECHNAC = row.FECHANACIMIENTO;
    delete dbRow.NOMBRE;
    delete dbRow.FECHANACIMIENTO;
  } else if (table === 'PERSONA') {
    if (row.NOMBRES && !row.NOMBRE) dbRow.NOMBRE = row.NOMBRES;
    if (row.DOCUMENTO && !row.DNI) dbRow.DNI = row.DOCUMENTO;
    if (row.TELEFONO && !row.CELULAR) dbRow.CELULAR = row.TELEFONO;
    if (row.EMAIL && !row.CORREO) dbRow.CORREO = row.EMAIL;
    delete dbRow.NOMBRES;
    delete dbRow.APELLIDOS;
    delete dbRow.DOCUMENTO;
    delete dbRow.TELEFONO;
    delete dbRow.EMAIL;
  } else if (table === 'VENTA') {
    if (row.FECHA && !row.FECH_VENTA) dbRow.FECH_VENTA = row.FECHA;
    if (row.TOTAL !== undefined && !row.TOTALAAPAGAR) dbRow.TOTALAAPAGAR = row.TOTAL;
    if (row.ESTADO && row.ESTADO === 'CONFIRMADA') dbRow.ESTADO = '1';
    delete dbRow.FECHA;
  }
  return dbRow;
}

export const GET: APIRoute = async ({ request }) => {
  let pool = null;
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get('table');
    pool = getPool();

    // Comprobar conexion con consulta basica inicial
    await pool.query('SELECT 1');

    if (table) {
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
      }
      const res = await pool.query(`SELECT * FROM "${table}"`);
      const transformed = res.rows.map((r: any) => transformRow(table, r));
      return new Response(JSON.stringify({ ok: true, data: transformed }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cargar tablas secuencialmente con pool de 1 conexion
    const fullDb: Record<string, any[]> = {};
    for (const tbl of TABLES) {
      try {
        const r = await pool.query(`SELECT * FROM "${tbl}"`);
        fullDb[tbl] = r.rows.map((row: any) => transformRow(tbl, row));
      } catch (e: any) {
        console.error(`Error querying table ${tbl}:`, e?.message);
        // No sobreescribir con array vacio si fue error de conexion total
        if (e?.code === '53300' || e?.message?.includes('connection')) {
          throw e;
        }
        fullDb[tbl] = [];
      }
    }

    return new Response(JSON.stringify({ ok: true, data: fullDb }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('API /api/data GET error:', err?.message);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error en conexion a base de datos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await closePool();
  }
};

export const POST: APIRoute = async ({ request }) => {
  let pool = null;
  try {
    const body = await request.json();
    const { table, row } = body;

    if (!table || !row || !/^[a-zA-Z0-9_]+$/.test(table)) {
      return new Response(JSON.stringify({ error: 'Invalid table or record' }), { status: 400 });
    }

    pool = getPool();
    const preparedRow = toDbRow(table, row);
    const keys = Object.keys(preparedRow);
    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'Row is empty' }), { status: 400 });
    }

    const colNames = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => preparedRow[k]);

    const query = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
    const res = await pool.query(query, values);
    const inserted = transformRow(table, res.rows[0] || row);

    return new Response(JSON.stringify({ ok: true, inserted }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('API /api/data POST error:', err?.message);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error al guardar en base de datos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await closePool();
  }
};
