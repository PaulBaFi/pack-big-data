import { query, closePool, closeAllPools } from './db';

export interface SourceSystemInfo {
  id: string;
  nombre: string;
  estrato: string;
  rubro: string;
  tablaOrigen: string;
  tablaDestino: string;
  oltpCount: number;
  olapCount: number;
  pendingCount: number;
  isSynced: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  latencyMs: number;
  lastOltpDate: string | null;
  lastOlapDate: string | null;
  dbName: string;
}

export async function getSourcesStatus(): Promise<{ sources: SourceSystemInfo[]; globalSyncPercentage: number; totalOltp: number; totalOlap: number; totalPending: number }> {
  const sourcesDef = [
    {
      id: 'castillonv2',
      nombre: 'Castillon V2',
      estrato: 'Microempresa',
      rubro: 'Restaurante y Servicios Gastronómicos',
      dbKey: 'castillonv2' as const,
      tablaOrigen: 'VENTAS',
      countQueryOltp: 'SELECT count(*) as cnt, MAX("FECHAVENTA") as max_date FROM "VENTAS";',
      dbName: 'castillonv2',
      tablaDestino: 'fact_ventas_privadas (id_empresa Micro)',
      countQueryOlap: `
        SELECT count(*) as cnt, MAX(t.fecha) as max_date 
        FROM fact_ventas_privadas f
        JOIN dim_empresa e ON f.id_empresa = e.id_empresa
        JOIN dim_tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE e.estrato_tamanio = 'MICRO';
      `,
    },
    {
      id: 'veterinaria',
      nombre: 'Castillon Veterinaria',
      estrato: 'Mediana Empresa',
      rubro: 'Clínica Veterinaria y Farmacia',
      dbKey: 'veterinaria' as const,
      tablaOrigen: 'VENTA',
      countQueryOltp: 'SELECT count(*) as cnt, MAX(COALESCE("FECH_VENTA", "FECCRE")) as max_date FROM "VENTA";',
      dbName: 'castillon_veterinaria',
      tablaDestino: 'fact_ventas_privadas (id_empresa Mediana)',
      countQueryOlap: `
        SELECT count(*) as cnt, MAX(t.fecha) as max_date 
        FROM fact_ventas_privadas f
        JOIN dim_empresa e ON f.id_empresa = e.id_empresa
        JOIN dim_tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE e.estrato_tamanio = 'MEDIANA';
      `,
    },
    {
      id: 'samar',
      nombre: 'Samar Importadora S.A.',
      estrato: 'Gran Empresa',
      rubro: 'Importación y Distribución Mayorista B2B',
      dbKey: 'samar' as const,
      tablaOrigen: 'VENTAS',
      countQueryOltp: 'SELECT count(*) as cnt, MAX("FECHA") as max_date FROM "VENTAS";',
      dbName: 'samar_importadora',
      tablaDestino: 'fact_ventas_privadas (id_empresa Grande)',
      countQueryOlap: `
        SELECT count(*) as cnt, MAX(t.fecha) as max_date 
        FROM fact_ventas_privadas f
        JOIN dim_empresa e ON f.id_empresa = e.id_empresa
        JOIN dim_tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE e.estrato_tamanio = 'GRANDE';
      `,
    },
    {
      id: 'siga',
      nombre: 'SIGA 1646 (MEF)',
      estrato: 'Sector Público',
      rubro: 'Sistema Integrado de Gestión Administrativa',
      dbKey: 'siga' as const,
      tablaOrigen: 'SIG_ORDEN_ADQUISICION',
      countQueryOltp: 'SELECT count(*) as cnt, MAX("FECHA_ORDEN") as max_date FROM "SIG_ORDEN_ADQUISICION";',
      dbName: 'siga_1646',
      tablaDestino: 'fact_compras_estatales',
      countQueryOlap: `
        SELECT count(*) as cnt, MAX(t.fecha) as max_date 
        FROM fact_compras_estatales f
        JOIN dim_tiempo t ON f.id_tiempo = t.id_tiempo;
      `,
    },
  ];

  const sources: SourceSystemInfo[] = [];
  let totalOltp = 0;
  let totalOlap = 0;

  try {
    for (const s of sourcesDef) {
      let oltpCount = 0;
      let olapCount = 0;
      let lastOltpDate: string | null = null;
      let lastOlapDate: string | null = null;
      let latencyMs = 0;
      let status: 'ONLINE' | 'OFFLINE' | 'ERROR' = 'ONLINE';

      // Consultar OLTP y liberar conexion
      try {
        const t0 = Date.now();
        const oltpRes = await query(s.countQueryOltp, [], s.dbKey);
        latencyMs = Date.now() - t0;
        oltpCount = parseInt(oltpRes.rows[0]?.cnt || '0', 10);
        lastOltpDate = oltpRes.rows[0]?.max_date ? new Date(oltpRes.rows[0].max_date).toISOString().split('T')[0] : null;
      } catch (e: any) {
        status = 'ERROR';
        console.error(`[Monitor Error] Error consultando OLTP ${s.id}:`, e.message);
      } finally {
        await closePool(s.dbKey);
      }

      // Consultar OLAP
      try {
        const olapRes = await query(s.countQueryOlap, [], 'dw_olap');
        olapCount = parseInt(olapRes.rows[0]?.cnt || '0', 10);
        lastOlapDate = olapRes.rows[0]?.max_date ? new Date(olapRes.rows[0].max_date).toISOString().split('T')[0] : null;
      } catch (e: any) {
        console.error(`[Monitor Error] Error consultando OLAP para ${s.id}:`, e.message);
      }

      const pendingCount = Math.max(0, oltpCount - olapCount);
      totalOltp += oltpCount;
      totalOlap += olapCount;

      sources.push({
        id: s.id,
        nombre: s.nombre,
        estrato: s.estrato,
        rubro: s.rubro,
        tablaOrigen: s.tablaOrigen,
        tablaDestino: s.tablaDestino,
        oltpCount,
        olapCount,
        pendingCount,
        isSynced: pendingCount === 0,
        status,
        latencyMs,
        lastOltpDate,
        lastOlapDate,
        dbName: s.dbName,
      });
    }
  } finally {
    await closeAllPools();
  }

  const totalPending = Math.max(0, totalOltp - totalOlap);
  const globalSyncPercentage = totalOltp > 0 ? Math.min(100, Math.round((totalOlap / totalOltp) * 10000) / 100) : 100;

  return {
    sources,
    globalSyncPercentage,
    totalOltp,
    totalOlap,
    totalPending,
  };
}

export async function getSourcePreview(sourceId: string): Promise<any[]> {
  try {
    if (sourceId === 'castillonv2') {
      const res = await query(
        `SELECT "IDVENTAS", "DOCUMENTO", "FECHAVENTA", "TOTALPAGAR", "IDCLIENTE" 
         FROM "VENTAS" 
         ORDER BY "FECHAVENTA" DESC NULLS LAST, "IDVENTAS" DESC 
         LIMIT 12;`,
        [],
        'castillonv2'
      );
      await closePool('castillonv2');

      const docs = res.rows.map((r) => r.DOCUMENTO);
      const olapRes = await query(
        `SELECT nro_comprobante FROM fact_ventas_privadas WHERE nro_comprobante = ANY($1);`,
        [docs],
        'dw_olap'
      );
      const existing = new Set(olapRes.rows.map((r) => r.nro_comprobante));
      return res.rows.map((r) => ({
        id: r.IDVENTAS,
        documento: r.DOCUMENTO || `VTA-${r.IDVENTAS}`,
        fecha: r.FECHAVENTA ? new Date(r.FECHAVENTA).toISOString().split('T')[0] : 'N/A',
        total: parseFloat(r.TOTALPAGAR || 0).toFixed(2),
        referencia: r.IDCLIENTE ? `Cliente #${r.IDCLIENTE}` : 'Consumidor Final',
        isSynced: existing.has(r.DOCUMENTO),
      }));
    }

    if (sourceId === 'veterinaria') {
      const res = await query(
        `SELECT "IDVENTA", "TIPO_COMPROBANTE", COALESCE("FECH_VENTA", "FECCRE") as fecha, "TOTAL", "TOTALAAPAGAR", "IDCLIENTE"
         FROM "VENTA" 
         ORDER BY fecha DESC NULLS LAST, "IDVENTA" DESC 
         LIMIT 12;`,
        [],
        'veterinaria'
      );
      await closePool('veterinaria');

      return res.rows.map((r) => ({
        id: r.IDVENTA,
        documento: `VET-${r.IDVENTA}`,
        fecha: r.fecha ? new Date(r.fecha).toISOString().split('T')[0] : 'N/A',
        total: parseFloat(r.TOTALAAPAGAR || r.TOTAL || 0).toFixed(2),
        referencia: r.TIPO_COMPROBANTE === 'F' ? 'FACTURA' : 'BOLETA',
        isSynced: true,
      }));
    }

    if (sourceId === 'samar') {
      const res = await query(
        `SELECT "DOCUMENTO", "TIPO_DOCUMENTO", "FECHA", "TOTAL_DOCUMENTO", "ID_CLIENTE" 
         FROM "VENTAS" 
         ORDER BY "FECHA" DESC NULLS LAST, "DOCUMENTO" DESC 
         LIMIT 12;`,
        [],
        'samar'
      );
      await closePool('samar');

      const docs = res.rows.map((r) => r.DOCUMENTO);
      const olapRes = await query(
        `SELECT nro_comprobante FROM fact_ventas_privadas WHERE nro_comprobante = ANY($1);`,
        [docs],
        'dw_olap'
      );
      const existing = new Set(olapRes.rows.map((r) => r.nro_comprobante));
      return res.rows.map((r) => ({
        id: r.DOCUMENTO,
        documento: r.DOCUMENTO,
        fecha: r.FECHA ? new Date(r.FECHA).toISOString().split('T')[0] : 'N/A',
        total: parseFloat(r.TOTAL_DOCUMENTO || 0).toFixed(2),
        referencia: `${r.TIPO_DOCUMENTO || 'FACTURA'} (${r.ID_CLIENTE || 'CLI'})`,
        isSynced: existing.has(r.DOCUMENTO),
      }));
    }

    if (sourceId === 'siga') {
      const res = await query(
        `SELECT "ANO_EJE", "NRO_ORDEN", "FECHA_ORDEN", "TOTAL_FACT_SOLES", "PROVEEDOR" 
         FROM "SIG_ORDEN_ADQUISICION" 
         ORDER BY "ANO_EJE" DESC, "NRO_ORDEN" DESC 
         LIMIT 12;`,
        [],
        'siga'
      );
      await closePool('siga');

      return res.rows.map((r) => ({
        id: `${r.ANO_EJE}-${r.NRO_ORDEN}`,
        documento: `OC-${r.NRO_ORDEN}`,
        fecha: r.FECHA_ORDEN ? new Date(r.FECHA_ORDEN).toISOString().split('T')[0] : `${r.ANO_EJE}-01-01`,
        total: parseFloat(r.TOTAL_FACT_SOLES || 0).toFixed(2),
        referencia: `Proveedor ${r.PROVEEDOR}`,
        isSynced: true,
      }));
    }

    return [];
  } catch (err: any) {
    console.error(`[Preview Error] Error en vista previa de ${sourceId}:`, err.message);
    return [];
  } finally {
    await closeAllPools();
  }
}
