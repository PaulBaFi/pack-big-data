import { query } from './db';

export interface AuditCheckResult {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: 'APROBADO' | 'ADVERTENCIA' | 'FALLIDO';
  detalles: string;
  itemsAfectados: number;
}

export interface OlapOverviewData {
  dimensiones: {
    tiempo: number;
    empresa: number;
    ubicacion: number;
    categoria: number;
    tipoPago: number;
  };
  hechos: {
    totalVentasPrivadas: number;
    totalComprasEstatales: number;
    montoTotalVentas: number;
    ticketPromedioVentas: number;
    montoTotalCompras: number;
    comprasMype: {
      monto: number;
      ordenes: number;
      porcentaje: number;
    };
    comprasGrandes: {
      monto: number;
      ordenes: number;
      porcentaje: number;
    };
  };
  estratos: {
    micro: { ordenes: number; monto: number };
    mediana: { ordenes: number; monto: number };
    grande: { ordenes: number; monto: number };
  };
}

export async function getOlapOverview(): Promise<OlapOverviewData> {
  const [dimT, dimE, dimU, dimC, dimP] = await Promise.all([
    query('SELECT count(*) as cnt FROM dim_tiempo;', [], 'dw_olap'),
    query('SELECT count(*) as cnt FROM dim_empresa;', [], 'dw_olap'),
    query('SELECT count(*) as cnt FROM dim_ubicacion;', [], 'dw_olap'),
    query('SELECT count(*) as cnt FROM dim_categoria_item;', [], 'dw_olap'),
    query('SELECT count(*) as cnt FROM dim_tipo_pago;', [], 'dw_olap'),
  ]);

  const [factsPriv, factsPub, estratoRes, mypeRes] = await Promise.all([
    query(
      `SELECT count(*) as cnt, 
              COALESCE(SUM(monto_total), 0) as total_monto,
              COALESCE(AVG(monto_total), 0) as ticket_prom 
       FROM fact_ventas_privadas;`,
      [],
      'dw_olap'
    ),
    query(
      `SELECT count(*) as cnt, 
              COALESCE(SUM(monto_adjudicado), 0) as total_monto 
       FROM fact_compras_estatales;`,
      [],
      'dw_olap'
    ),
    query(
      `SELECT e.estrato_tamanio, COUNT(*) as cnt, COALESCE(SUM(f.monto_total), 0) as monto
       FROM fact_ventas_privadas f
       JOIN dim_empresa e ON f.id_empresa = e.id_empresa
       GROUP BY e.estrato_tamanio;`,
      [],
      'dw_olap'
    ),
    query(
      `SELECT flag_proveedor_mype, COUNT(*) as cnt, COALESCE(SUM(monto_adjudicado), 0) as monto
       FROM fact_compras_estatales
       GROUP BY flag_proveedor_mype;`,
      [],
      'dw_olap'
    ),
  ]);

  const estratoMap: Record<string, { ordenes: number; monto: number }> = {
    MICRO: { ordenes: 0, monto: 0 },
    MEDIANA: { ordenes: 0, monto: 0 },
    GRANDE: { ordenes: 0, monto: 0 },
  };
  for (const r of estratoRes.rows) {
    if (estratoMap[r.estrato_tamanio]) {
      estratoMap[r.estrato_tamanio] = {
        ordenes: parseInt(r.cnt, 10),
        monto: Math.round(parseFloat(r.monto) * 100) / 100,
      };
    }
  }

  const totCompras = parseFloat(factsPub.rows[0]?.total_monto || '0');
  const mypeRow = mypeRes.rows.find((r) => ['S', 'SI', '1', 'MYPE'].includes(String(r.flag_proveedor_mype || '').toUpperCase()));
  const granRow = mypeRes.rows.find((r) => !['S', 'SI', '1', 'MYPE'].includes(String(r.flag_proveedor_mype || '').toUpperCase()));

  const mypeMonto = mypeRow ? parseFloat(mypeRow.monto) : 0;
  const granMonto = granRow ? parseFloat(granRow.monto) : 0;

  return {
    dimensiones: {
      tiempo: parseInt(dimT.rows[0]?.cnt || '0', 10),
      empresa: parseInt(dimE.rows[0]?.cnt || '0', 10),
      ubicacion: parseInt(dimU.rows[0]?.cnt || '0', 10),
      categoria: parseInt(dimC.rows[0]?.cnt || '0', 10),
      tipoPago: parseInt(dimP.rows[0]?.cnt || '0', 10),
    },
    hechos: {
      totalVentasPrivadas: parseInt(factsPriv.rows[0]?.cnt || '0', 10),
      totalComprasEstatales: parseInt(factsPub.rows[0]?.cnt || '0', 10),
      montoTotalVentas: Math.round(parseFloat(factsPriv.rows[0]?.total_monto || '0') * 100) / 100,
      ticketPromedioVentas: Math.round(parseFloat(factsPriv.rows[0]?.ticket_prom || '0') * 100) / 100,
      montoTotalCompras: Math.round(totCompras * 100) / 100,
      comprasMype: {
        monto: Math.round(mypeMonto * 100) / 100,
        ordenes: mypeRow ? parseInt(mypeRow.cnt, 10) : 0,
        porcentaje: totCompras > 0 ? Math.round((mypeMonto / totCompras) * 10000) / 100 : 0,
      },
      comprasGrandes: {
        monto: Math.round(granMonto * 100) / 100,
        ordenes: granRow ? parseInt(granRow.cnt, 10) : 0,
        porcentaje: totCompras > 0 ? Math.round((granMonto / totCompras) * 10000) / 100 : 0,
      },
    },
    estratos: {
      micro: estratoMap.MICRO,
      mediana: estratoMap.MEDIANA,
      grande: estratoMap.GRANDE,
    },
  };
}

export async function runQualityAudit(): Promise<{ checks: AuditCheckResult[]; score: number; overallStatus: string; auditedAt: string }> {
  const checks: AuditCheckResult[] = [];

  // 1. Auditoría de Duplicados en Ventas Privadas (Nivel Transaccional)
  const dupPrivRes = await query(
    `SELECT id_tiempo, id_empresa, nro_comprobante, monto_total, count(*) as c 
     FROM fact_ventas_privadas 
     GROUP BY id_tiempo, id_empresa, nro_comprobante, monto_total 
     HAVING count(*) > 1;`,
    [],
    'dw_olap'
  );
  const dupPrivCount = dupPrivRes.rows.length;
  checks.push({
    codigo: 'AUD-001',
    nombre: 'Control de Duplicados en Ventas Privadas',
    descripcion: 'Verifica la unicidad transaccional (tiempo, empresa, comprobante y monto).',
    estado: dupPrivCount === 0 ? 'APROBADO' : 'FALLIDO',
    detalles: dupPrivCount === 0 ? '0 transacciones duplicadas. Unicidad 100% garantizada.' : `${dupPrivCount} transacciones repetidas.`,
    itemsAfectados: dupPrivCount,
  });

  // 2. Auditoría de Duplicados en Compras Estatales (SIGA)
  const dupPubRes = await query(
    `SELECT nro_orden, ano_eje, tipo_bien, id_proveedor, count(*) as c 
     FROM fact_compras_estatales 
     GROUP BY nro_orden, ano_eje, tipo_bien, id_proveedor 
     HAVING count(*) > 1;`,
    [],
    'dw_olap'
  );
  const dupPubCount = dupPubRes.rows.length;
  checks.push({
    codigo: 'AUD-002',
    nombre: 'Control de Duplicados en Compras SIGA',
    descripcion: 'Verifica la unicidad de las órdenes por año fiscal, tipo de bien y proveedor.',
    estado: dupPubCount === 0 ? 'APROBADO' : 'FALLIDO',
    detalles: dupPubCount === 0 ? '0 órdenes de compra duplicadas. Integridad de adquisiciones 100%.' : `${dupPubCount} órdenes repetidas encontradas.`,
    itemsAfectados: dupPubCount,
  });

  // 3. Integridad Referencial y Huérfanos en Ventas Privadas
  const orphPrivRes = await query(
    `SELECT 
       COUNT(*) FILTER (WHERE t.id_tiempo IS NULL) as orphan_tiempo,
       COUNT(*) FILTER (WHERE e.id_empresa IS NULL) as orphan_empresa,
       COUNT(*) FILTER (WHERE u.id_ubicacion IS NULL) as orphan_ubicacion,
       COUNT(*) FILTER (WHERE c.id_categoria IS NULL) as orphan_categoria,
       COUNT(*) FILTER (WHERE p.id_tipo_pago IS NULL) as orphan_pago
     FROM fact_ventas_privadas f
     LEFT JOIN dim_tiempo t ON f.id_tiempo = t.id_tiempo
     LEFT JOIN dim_empresa e ON f.id_empresa = e.id_empresa
     LEFT JOIN dim_ubicacion u ON f.id_ubicacion = u.id_ubicacion
     LEFT JOIN dim_categoria_item c ON f.id_categoria = c.id_categoria
     LEFT JOIN dim_tipo_pago p ON f.id_tipo_pago = p.id_tipo_pago;`,
    [],
    'dw_olap'
  );
  const rPriv = orphPrivRes.rows[0] || {};
  const totalOrphPriv =
    parseInt(rPriv.orphan_tiempo || '0', 10) +
    parseInt(rPriv.orphan_empresa || '0', 10) +
    parseInt(rPriv.orphan_ubicacion || '0', 10) +
    parseInt(rPriv.orphan_categoria || '0', 10) +
    parseInt(rPriv.orphan_pago || '0', 10);

  checks.push({
    codigo: 'AUD-003',
    nombre: 'Integridad Referencial en Ventas Privadas',
    descripcion: 'Verifica que todas las claves foráneas apunten a dimensiones válidas del Star Schema.',
    estado: totalOrphPriv === 0 ? 'APROBADO' : 'FALLIDO',
    detalles: totalOrphPriv === 0 ? '100% de los hechos enlazados a dimensiones. Cero huérfanos.' : `${totalOrphPriv} registros huérfanos detectados.`,
    itemsAfectados: totalOrphPriv,
  });

  // 4. Normalización de Montos Monetarios (Valores no nulos, positivos)
  const normMontoRes = await query(
    `SELECT COUNT(*) as cnt 
     FROM fact_ventas_privadas 
     WHERE monto_total IS NULL OR monto_total < 0;`,
    [],
    'dw_olap'
  );
  const badMontos = parseInt(normMontoRes.rows[0]?.cnt || '0', 10);
  checks.push({
    codigo: 'AUD-004',
    nombre: 'Normalización y Validación de Montos',
    descripcion: 'Asegura que no existan valores nulos ni montos monetarios negativos en ventas.',
    estado: badMontos === 0 ? 'APROBADO' : 'FALLIDO',
    detalles: badMontos === 0 ? 'Montos y subtotales validados y normalizados correctamente.' : `${badMontos} montos inconsistentes.`,
    itemsAfectados: badMontos,
  });

  // 5. Normalización de Estratos Empresariales y Clasificación MYPE
  const normEmpRes = await query(
    `SELECT COUNT(*) as cnt 
     FROM dim_empresa 
     WHERE estrato_tamanio NOT IN ('MICRO', 'MEDIANA', 'GRANDE', 'ESTADO')
        OR flag_mype NOT IN ('MYPE', 'NO_MYPE', 'NO_APLICA');`,
    [],
    'dw_olap'
  );
  const badEmp = parseInt(normEmpRes.rows[0]?.cnt || '0', 10);
  checks.push({
    codigo: 'AUD-005',
    nombre: 'Normalización de Estratos y Clasificación MYPE',
    descripcion: 'Valida que el 100% de empresas pertenezcan a la taxonomía empresarial requerida.',
    estado: badEmp === 0 ? 'APROBADO' : 'FALLIDO',
    detalles: badEmp === 0 ? 'Todas las empresas clasificadas en Micro, Mediana, Grande o Estado.' : `${badEmp} empresas con taxonomía no reconocida.`,
    itemsAfectados: badEmp,
  });

  // 6. Consistencia Temporal
  const normTimeRes = await query(
    `SELECT COUNT(*) as cnt 
     FROM fact_ventas_privadas f 
     LEFT JOIN dim_tiempo t ON f.id_tiempo = t.id_tiempo 
     WHERE t.anio < 2015 OR t.anio > 2026;`,
    [],
    'dw_olap'
  );
  const badTime = parseInt(normTimeRes.rows[0]?.cnt || '0', 10);
  checks.push({
    codigo: 'AUD-006',
    nombre: 'Consistencia de Serie Temporal (2015-2026)',
    descripcion: 'Verifica que las transacciones correspondan al periodo de análisis del Data Warehouse.',
    estado: badTime === 0 ? 'APROBADO' : 'FALLIDO',
    detalles: badTime === 0 ? 'Fechas alineadas con el calendario dimensional 2015-2026.' : `${badTime} hechos fuera de rango.`,
    itemsAfectados: badTime,
  });

  const passed = checks.filter((c) => c.estado === 'APROBADO').length;
  const score = Math.round((passed / checks.length) * 100);
  const overallStatus = score === 100 ? 'EXCELENTE (100% CALIDAD CERTIFICADA)' : score >= 80 ? 'BUENO' : 'REQUIERE ATENCION';

  return {
    checks,
    score,
    overallStatus,
    auditedAt: new Date().toISOString(),
  };
}

export async function getReconciliationMatrix(): Promise<any> {
  const [c2, vet, samar, siga, privOlap, pubOlap] = await Promise.all([
    query('SELECT count(*) as cnt FROM "VENTAS";', [], 'castillonv2'),
    query('SELECT count(*) as cnt FROM "VENTA";', [], 'veterinaria'),
    query('SELECT count(*) as cnt FROM "VENTAS";', [], 'samar'),
    query('SELECT count(*) as cnt FROM "SIG_ORDEN_ADQUISICION";', [], 'siga'),
    query(
      `SELECT e.estrato_tamanio, count(*) as cnt 
       FROM fact_ventas_privadas f
       JOIN dim_empresa e ON f.id_empresa = e.id_empresa
       GROUP BY e.estrato_tamanio;`,
      [],
      'dw_olap'
    ),
    query('SELECT count(*) as cnt FROM fact_compras_estatales;', [], 'dw_olap'),
  ]);

  const olapMap: Record<string, number> = {};
  for (const r of privOlap.rows) {
    olapMap[r.estrato_tamanio] = parseInt(r.cnt, 10);
  }

  const c2Oltp = parseInt(c2.rows[0]?.cnt || '0', 10);
  const vetOltp = parseInt(vet.rows[0]?.cnt || '0', 10);
  const samarOltp = parseInt(samar.rows[0]?.cnt || '0', 10);
  const sigaOltp = parseInt(siga.rows[0]?.cnt || '0', 10);

  const c2Olap = olapMap['MICRO'] || 0;
  const vetOlap = olapMap['MEDIANA'] || 0;
  const samarOlap = olapMap['GRANDE'] || 0;
  const sigaOlap = parseInt(pubOlap.rows[0]?.cnt || '0', 10);

  const matrix = [
    {
      sistema: 'Castillon V2 (Microempresa)',
      tablaOrigen: 'castillonv2."VENTAS"',
      tablaDestino: 'dw_empresas_olap.fact_ventas_privadas',
      registrosOltp: c2Oltp,
      hechosOlap: c2Olap,
      diferencial: Math.abs(c2Oltp - c2Olap),
      tasaSincronizacion: c2Oltp > 0 ? (c2Olap / c2Oltp) * 100 : 100,
      estado: c2Oltp === c2Olap ? 'SINCRONIZADO' : 'PENDIENTE',
    },
    {
      sistema: 'Castillon Veterinaria (Mediana)',
      tablaOrigen: 'castillon_veterinaria."VENTA"',
      tablaDestino: 'dw_empresas_olap.fact_ventas_privadas',
      registrosOltp: vetOltp,
      hechosOlap: vetOlap,
      diferencial: Math.abs(vetOltp - vetOlap),
      tasaSincronizacion: vetOltp > 0 ? (vetOlap / vetOltp) * 100 : 100,
      estado: vetOltp === vetOlap ? 'SINCRONIZADO' : 'PENDIENTE',
    },
    {
      sistema: 'Samar Importadora (Gran Empresa)',
      tablaOrigen: 'samar_importadora."VENTAS"',
      tablaDestino: 'dw_empresas_olap.fact_ventas_privadas',
      registrosOltp: samarOltp,
      hechosOlap: samarOlap,
      diferencial: Math.abs(samarOltp - samarOlap),
      tasaSincronizacion: samarOltp > 0 ? (samarOlap / samarOltp) * 100 : 100,
      estado: samarOltp === samarOlap ? 'SINCRONIZADO' : 'PENDIENTE',
    },
    {
      sistema: 'SIGA MEF (Sector Público)',
      tablaOrigen: 'siga_1646."SIG_ORDEN_ADQUISICION"',
      tablaDestino: 'dw_empresas_olap.fact_compras_estatales',
      registrosOltp: sigaOltp,
      hechosOlap: sigaOlap,
      diferencial: Math.abs(sigaOltp - sigaOlap),
      tasaSincronizacion: sigaOltp > 0 ? (sigaOlap / sigaOltp) * 100 : 100,
      estado: sigaOltp === sigaOlap ? 'SINCRONIZADO' : 'PENDIENTE',
    },
  ];

  const totalOltp = c2Oltp + vetOltp + samarOltp + sigaOltp;
  const totalOlap = c2Olap + vetOlap + samarOlap + sigaOlap;
  const isFullySynced = totalOltp === totalOlap && totalOltp > 0;

  return {
    matrix,
    totalOltp,
    totalOlap,
    diferencialTotal: Math.abs(totalOltp - totalOlap),
    tasaGlobal: totalOltp > 0 ? Math.round((totalOlap / totalOltp) * 10000) / 100 : 100,
    isFullySynced,
    fechaCertificacion: new Date().toISOString(),
  };
}
