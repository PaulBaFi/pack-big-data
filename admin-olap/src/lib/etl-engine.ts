import { query, closePool, closeAllPools } from './db';
import { logAdminAction } from './auth';

export interface EtlRunResult {
  success: boolean;
  logId?: number;
  durationSeconds: number;
  filasCastillonv2: number;
  filasVeterinaria: number;
  filasSamar: number;
  filasSiga: number;
  totalFilas: number;
  errorMessage?: string;
  detalles: any;
}

export async function runEtlPipeline(triggerBy: string = 'BOTON_MANUAL', userEmail: string = 'admin@bigdata.upsjb.edu.pe'): Promise<EtlRunResult> {
  const startTime = Date.now();
  const fechaInicio = new Date();

  // 1. Iniciar registro de auditoria en etl_log_ejecucion
  const initRes = await query<{ id_log: number }>(
    `INSERT INTO etl_log_ejecucion (fecha_inicio, estado, ejecutado_por)
     VALUES ($1, 'EN_PROCESO', $2) RETURNING id_log;`,
    [fechaInicio, triggerBy],
    'dw_olap'
  );
  const logId = initRes.rows[0].id_log;

  let cntC2 = 0;
  let cntVet = 0;
  let cntSamar = 0;
  let cntSiga = 0;

  try {
    // 2. Poblar Dimensión Tiempo (2015 a 2026)
    await populateDimTiempo();

    // 3. Poblar Dimensión Empresa (Estratos y Contratistas)
    await populateDimEmpresa();

    // 4. Poblar Dimensión Ubicación, Método de Pago y Categorías
    await populateDimUbicacion();
    await populateDimTipoPago();
    await populateDimCategoriaItem();

    // 5. Cargar Hechos: Limpiar y recargar con integridad total
    await query('TRUNCATE TABLE fact_ventas_privadas RESTART IDENTITY CASCADE;', [], 'dw_olap');
    await query('TRUNCATE TABLE fact_compras_estatales RESTART IDENTITY CASCADE;', [], 'dw_olap');

    // Obtener IDs de referencia de dimensiones
    const empRes = await query('SELECT id_empresa, estrato_tamanio, fuente_origen, codigo_origen FROM dim_empresa;', [], 'dw_olap');
    const empMap = empRes.rows;
    const empC2 = empMap.find((r) => r.estrato_tamanio === 'MICRO')?.id_empresa || 1;
    const empVet = empMap.find((r) => r.estrato_tamanio === 'MEDIANA')?.id_empresa || 1;
    const empSamar = empMap.find((r) => r.estrato_tamanio === 'GRANDE')?.id_empresa || 1;

    const sigaEmpMap: Record<string, number> = {};
    for (const r of empMap) {
      if (r.fuente_origen === 'siga_1646') {
        sigaEmpMap[String(r.codigo_origen)] = r.id_empresa;
      }
    }

    const pagoRes = await query('SELECT id_tipo_pago FROM dim_tipo_pago LIMIT 1;', [], 'dw_olap');
    const pagoDef = pagoRes.rows[0]?.id_tipo_pago || 1;

    const ubiRes = await query('SELECT id_ubicacion FROM dim_ubicacion LIMIT 1;', [], 'dw_olap');
    const ubiDef = ubiRes.rows[0]?.id_ubicacion || 1;

    const catRes = await query('SELECT id_categoria FROM dim_categoria_item LIMIT 1;', [], 'dw_olap');
    const catDef = catRes.rows[0]?.id_categoria || 1;

    // --- CARGA CASTILLONV2 (Microempresa) ---
    const c2Ventas = await query(
      'SELECT "FECHAVENTA", "DOCUMENTO", "SUBTOTOTAL", "IGV", "TOTALPAGAR", "DESCUENTO" FROM "VENTAS";',
      [],
      'castillonv2'
    );
    await closePool('castillonv2'); // Liberar conexion inmediatamente

    if (c2Ventas.rows.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const r of c2Ventas.rows) {
        const f = r.FECHAVENTA ? new Date(r.FECHAVENTA) : new Date(2026, 0, 1);
        const idTiempo = f.getFullYear() * 10000 + (f.getMonth() + 1) * 100 + f.getDate();
        const sub = parseFloat(r.SUBTOTOTAL || 0);
        const igv = parseFloat(r.IGV || 0);
        const tot = parseFloat(r.TOTALPAGAR || sub + igv);
        const desc = parseFloat(r.DESCUENTO || 0);

        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(
          idTiempo,
          empC2,
          ubiDef,
          catDef,
          pagoDef,
          r.DOCUMENTO || 'VENTA_C2',
          'BOLETA',
          1.0,
          sub,
          igv,
          tot,
          desc,
          tot
        );
      }
      await query(
        `INSERT INTO fact_ventas_privadas 
         (id_tiempo, id_empresa, id_ubicacion, id_categoria, id_tipo_pago, nro_comprobante, tipo_comprobante, cantidad, monto_subtotal, monto_impuesto, monto_total, descuento, ticket_promedio)
         VALUES ${placeholders.join(', ')};`,
        values,
        'dw_olap'
      );
      cntC2 = c2Ventas.rows.length;
    }

    // --- CARGA VETERINARIA (Mediana Empresa) ---
    const vetVentas = await query(
      'SELECT COALESCE("FECH_VENTA", "FECCRE") as f, "SUBTOTAL", "IGV", "MONTOTOTAL", "DESCUENTO", "TIPO_COMPROBANTE" FROM "VENTA";',
      [],
      'veterinaria'
    );
    await closePool('veterinaria'); // Liberar conexion inmediatamente

    if (vetVentas.rows.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const r of vetVentas.rows) {
        const f = r.f ? new Date(r.f) : new Date(2026, 0, 1);
        const idTiempo = f.getFullYear() * 10000 + (f.getMonth() + 1) * 100 + f.getDate();
        const sub = parseFloat(r.SUBTOTAL || 0);
        const igv = parseFloat(r.IGV || 0);
        const tot = parseFloat(r.MONTOTOTAL || sub + igv);
        const desc = parseFloat(r.DESCUENTO || 0);

        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(
          idTiempo,
          empVet,
          ubiDef,
          catDef,
          pagoDef,
          'VENTA_VET',
          r.TIPO_COMPROBANTE || 'BOLETA',
          1.0,
          sub,
          igv,
          tot,
          desc,
          tot
        );
      }
      await query(
        `INSERT INTO fact_ventas_privadas 
         (id_tiempo, id_empresa, id_ubicacion, id_categoria, id_tipo_pago, nro_comprobante, tipo_comprobante, cantidad, monto_subtotal, monto_impuesto, monto_total, descuento, ticket_promedio)
         VALUES ${placeholders.join(', ')};`,
        values,
        'dw_olap'
      );
      cntVet = vetVentas.rows.length;
    }

    // --- CARGA SAMAR IMPORTADORA (Gran Empresa) ---
    const samarVentas = await query(
      'SELECT "FECHA", "DOCUMENTO", "TIPO_DOCUMENTO", "TOTAL_NETO", "IMPUESTO", "TOTAL_DOCUMENTO" FROM "VENTAS";',
      [],
      'samar'
    );
    await closePool('samar'); // Liberar conexion inmediatamente

    if (samarVentas.rows.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < samarVentas.rows.length; i += batchSize) {
        const chunk = samarVentas.rows.slice(i, i + batchSize);
        const values: any[] = [];
        const placeholders: string[] = [];
        let idx = 1;
        for (const r of chunk) {
          const f = r.FECHA ? new Date(r.FECHA) : new Date(2026, 0, 1);
          const idTiempo = f.getFullYear() * 10000 + (f.getMonth() + 1) * 100 + f.getDate();
          const sub = parseFloat(r.TOTAL_NETO || 0);
          const igv = parseFloat(r.IMPUESTO || 0);
          const tot = parseFloat(r.TOTAL_DOCUMENTO || sub + igv);

          placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
          values.push(
            idTiempo,
            empSamar,
            ubiDef,
            catDef,
            pagoDef,
            r.DOCUMENTO || 'DOC_SAMAR',
            r.TIPO_DOCUMENTO || 'FACTURA',
            1.0,
            sub,
            igv,
            tot,
            0.0,
            tot
          );
        }
        await query(
          `INSERT INTO fact_ventas_privadas 
           (id_tiempo, id_empresa, id_ubicacion, id_categoria, id_tipo_pago, nro_comprobante, tipo_comprobante, cantidad, monto_subtotal, monto_impuesto, monto_total, descuento, ticket_promedio)
           VALUES ${placeholders.join(', ')};`,
          values,
          'dw_olap'
        );
      }
      cntSamar = samarVentas.rows.length;
    }

    // --- CARGA SIGA 1646 MEF (Compras Estatales) ---
    const sigaCompras = await query(
      `SELECT o."ANO_EJE", o."NRO_ORDEN", o."FECHA_ORDEN", o."PROVEEDOR", o."TIPO_BIEN", o."TOTAL_FACT_SOLES", o."ESTADO", c."FLAG_MYPE"
       FROM "SIG_ORDEN_ADQUISICION" o
       LEFT JOIN "SIG_CONTRATISTAS" c ON o."PROVEEDOR" = c."PROVEEDOR";`,
      [],
      'siga'
    );
    await closePool('siga'); // Liberar conexion inmediatamente

    if (sigaCompras.rows.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < sigaCompras.rows.length; i += batchSize) {
        const chunk = sigaCompras.rows.slice(i, i + batchSize);
        const values: any[] = [];
        const placeholders: string[] = [];
        let idx = 1;
        for (const r of chunk) {
          let f = r.FECHA_ORDEN ? new Date(r.FECHA_ORDEN) : new Date(parseInt(r.ANO_EJE || '2026'), 0, 1);
          if (isNaN(f.getTime())) f = new Date(parseInt(r.ANO_EJE || '2026'), 0, 1);
          const idTiempo = f.getFullYear() * 10000 + (f.getMonth() + 1) * 100 + f.getDate();

          const provId = String(r.PROVEEDOR || '');
          const empId = sigaEmpMap[provId] || empSamar;

          const flagRaw = String(r.FLAG_MYPE || '').trim().toUpperCase();
          const flagMype = ['S', '1', 'SI', 'MYPE'].includes(flagRaw) ? 'MYPE' : 'NO_MYPE';
          const monto = parseFloat(r.TOTAL_FACT_SOLES || 0);
          const tipoB = String(r.TIPO_BIEN || '').toUpperCase() === 'B' ? 'B' : 'S';

          placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
          values.push(
            idTiempo,
            empId,
            ubiDef,
            catDef,
            String(r.NRO_ORDEN || 'ORDEN_SIGA'),
            parseInt(r.ANO_EJE || String(f.getFullYear())),
            tipoB,
            monto,
            1.0,
            monto,
            flagMype,
            r.ESTADO || 'ATENDIDO'
          );
        }
        await query(
          `INSERT INTO fact_compras_estatales
           (id_tiempo, id_proveedor, id_ubicacion, id_categoria, nro_orden, ano_eje, tipo_bien, monto_adjudicado, cantidad_items, precio_unitario, flag_proveedor_mype, estado_orden)
           VALUES ${placeholders.join(', ')};`,
          values,
          'dw_olap'
        );
      }
      cntSiga = sigaCompras.rows.length;
    }

    const totalFilas = cntC2 + cntVet + cntSamar + cntSiga;
    const durationSeconds = Math.round(((Date.now() - startTime) / 1000) * 100) / 100;
    const fechaFin = new Date();

    // Actualizar etl_log_ejecucion
    await query(
      `UPDATE etl_log_ejecucion
       SET fecha_fin = $1,
           duracion_segundos = $2,
           estado = 'COMPLETADO',
           filas_castillonv2 = $3,
           filas_veterinaria = $4,
           filas_samar = $5,
           filas_siga = $6,
           total_filas_cargadas = $7
       WHERE id_log = $8;`,
      [fechaFin, durationSeconds, cntC2, cntVet, cntSamar, cntSiga, totalFilas, logId],
      'dw_olap'
    );

    // Auditoría de usuario
    await logAdminAction(
      null,
      userEmail,
      'ETL_EXECUTION_SUCCESS',
      { logId, totalFilas, durationSeconds, triggerBy }
    );

    return {
      success: true,
      logId,
      durationSeconds,
      filasCastillonv2: cntC2,
      filasVeterinaria: cntVet,
      filasSamar: cntSamar,
      filasSiga: cntSiga,
      totalFilas,
      detalles: {
        privadas: cntC2 + cntVet + cntSamar,
        estatales: cntSiga,
      },
    };
  } catch (err: any) {
    const durationSeconds = Math.round(((Date.now() - startTime) / 1000) * 100) / 100;
    try {
      await query(
        `UPDATE etl_log_ejecucion
         SET fecha_fin = NOW(),
             duracion_segundos = $1,
             estado = 'ERROR',
             mensaje_error = $2
         WHERE id_log = $3;`,
        [durationSeconds, err.message, logId],
        'dw_olap'
      );
      await logAdminAction(null, userEmail, 'ETL_EXECUTION_ERROR', { error: err.message, triggerBy });
    } catch (logErr) {
      console.error('[ETL Logging Error]:', logErr);
    }

    return {
      success: false,
      logId,
      durationSeconds,
      filasCastillonv2: cntC2,
      filasVeterinaria: cntVet,
      filasSamar: cntSamar,
      filasSiga: cntSiga,
      totalFilas: 0,
      errorMessage: err.message,
      detalles: {},
    };
  } finally {
    // Cerrar todas las conexiones activas al finalizar la ejecucion
    await closeAllPools();
  }
}

// Helpers para dimensiones
async function populateDimTiempo(): Promise<void> {
  const dStart = new Date(2015, 0, 1);
  const dEnd = new Date(2026, 11, 31);
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

  const rows: any[] = [];
  const curr = new Date(dStart);
  while (curr <= dEnd) {
    const y = curr.getFullYear();
    const m = curr.getMonth() + 1;
    const d = curr.getDate();
    const idT = y * 10000 + m * 100 + d;
    const trimestre = Math.floor((m - 1) / 3) + 1;
    const semestre = m <= 6 ? 1 : 2;
    const diaSem = dias[curr.getDay()];
    const esFin = curr.getDay() === 0 || curr.getDay() === 6;

    rows.push([idT, curr.toISOString().split('T')[0], y, m, meses[m - 1], trimestre, semestre, diaSem, esFin]);
    curr.setDate(curr.getDate() + 1);
  }

  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const placeholders = chunk.map((_, idx) => {
      const base = idx * 9;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    });
    const flat = chunk.flat();
    await query(
      `INSERT INTO dim_tiempo (id_tiempo, fecha, anio, mes, nombre_mes, trimestre, semestre, dia_semana, es_fin_semana)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (id_tiempo) DO NOTHING;`,
      flat,
      'dw_olap'
    );
  }
}

async function populateDimEmpresa(): Promise<void> {
  const empresas: [string, string, string, string, string, string][] = [
    ['C2_MAIN', 'CASTILLONV2 RESTAURANTE', 'MICRO', 'PRIVADO', 'MYPE', 'CASTILLONV2'],
    ['VET_MAIN', 'CASTILLON CLINICA VETERINARIA', 'MEDIANA', 'PRIVADO', 'NO_MYPE', 'BD_CASTILLON_VETERINARIA'],
    ['SAMAR_CORP', 'SAMAR IMPORTADORA S.A.', 'GRANDE', 'PRIVADO', 'NO_MYPE', 'SamarImportadora'],
  ];

  try {
    const sigaCont = await query('SELECT "PROVEEDOR", "NOMBRE_PROV", "FLAG_MYPE" FROM "SIG_CONTRATISTAS";', [], 'siga');
    await closePool('siga');
    for (const r of sigaCont.rows) {
      const provId = String(r.PROVEEDOR || '');
      const nom = String(r.NOMBRE_PROV || `PROVEEDOR_${provId}`).trim();
      const flagRaw = String(r.FLAG_MYPE || '').trim().toUpperCase();
      const flagMype = ['S', '1', 'SI', 'MYPE'].includes(flagRaw) ? 'MYPE' : 'NO_MYPE';
      empresas.push([provId, nom, 'ESTADO', 'PUBLICO', flagMype, 'siga_1646']);
    }
  } catch (e) {
    console.warn('[ETL] Warning reading SIG_CONTRATISTAS:', e);
  }

  await query('TRUNCATE TABLE dim_empresa RESTART IDENTITY CASCADE;', [], 'dw_olap');

  const batchSize = 1000;
  for (let i = 0; i < empresas.length; i += batchSize) {
    const chunk = empresas.slice(i, i + batchSize);
    const placeholders = chunk.map((_, idx) => {
      const base = idx * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });
    const flat = chunk.flat();
    await query(
      `INSERT INTO dim_empresa (codigo_origen, razon_social, estrato_tamanio, sector, flag_mype, fuente_origen)
       VALUES ${placeholders.join(', ')};`,
      flat,
      'dw_olap'
    );
  }
}

async function populateDimUbicacion(): Promise<void> {
  await query('TRUNCATE TABLE dim_ubicacion RESTART IDENTITY CASCADE;', [], 'dw_olap');
  await query(
    `INSERT INTO dim_ubicacion (departamento, provincia, distrito_comuna, pais)
     VALUES 
      ('LIMA', 'LIMA', 'CENTRO', 'PERU'),
      ('METROPOLITANA', 'SANTIAGO', 'CENTRO', 'CHILE'),
      ('CALLAO', 'CALLAO', 'CALLAO', 'PERU');`,
    [],
    'dw_olap'
  );
}

async function populateDimTipoPago(): Promise<void> {
  await query('TRUNCATE TABLE dim_tipo_pago RESTART IDENTITY CASCADE;', [], 'dw_olap');
  await query(
    `INSERT INTO dim_tipo_pago (metodo_pago, tipo_transaccion)
     VALUES 
      ('EFECTIVO', 'CONTADO'),
      ('TARJETA DE DEBITO', 'CONTADO'),
      ('TARJETA DE CREDITO', 'CREDITO'),
      ('TRANSFERENCIA BANCARIA', 'CONTADO'),
      ('YAPE / PLIN', 'CONTADO'),
      ('ORDEN DE COMPRA ESTATAL', 'GUBERNAMENTAL'),
      ('OTRO', 'CONTADO');`,
    [],
    'dw_olap'
  );
}

async function populateDimCategoriaItem(): Promise<void> {
  await query('TRUNCATE TABLE dim_categoria_item RESTART IDENTITY CASCADE;', [], 'dw_olap');
  await query(
    `INSERT INTO dim_categoria_item (codigo_item, nombre_item, categoria, tipo_rubro, unidad_medida)
     VALUES 
      ('C2_GEN', 'PLATO O BEBIDA RESTAURANTE', 'RESTAURANTE', 'PRODUCTO', 'UNIDAD'),
      ('VET_MED', 'MEDICAMENTO O PRODUCTO VETERINARIO', 'CLINICA', 'PRODUCTO', 'UNIDAD'),
      ('VET_CONS', 'CONSULTA MEDICA GENERAL', 'SERVICIOS CLINICOS', 'SERVICIO', 'ATENCION'),
      ('SAMAR_ART', 'ARTICULO IMPORTACION MAYORISTA', 'IMPORTACIONES', 'BIEN', 'UNIDAD'),
      ('SIGA_BIEN', 'BIEN O SUMINISTRO ESTATAL', 'ESTATAL', 'BIEN', 'UNIDAD'),
      ('SIGA_SERV', 'SERVICIO CONTRATADO POR EL ESTADO', 'ESTATAL', 'SERVICIO', 'UNIDAD');`,
    [],
    'dw_olap'
  );
}
