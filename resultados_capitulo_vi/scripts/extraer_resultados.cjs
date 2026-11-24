const { Pool } = require('../../admin-olap/node_modules/pg');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..');
const outDir = path.join(repo, 'resultados_capitulo_vi', 'evidencias');
const envPath = path.join(repo, 'admin-olap', '.env');
for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  let value = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  process.env[line.slice(0, i).trim()] ||= value;
}

const configs = {
  castillonv2: process.env.DB_CASTILLONV2,
  veterinaria: process.env.DB_VETERINARIA,
  samar: process.env.DB_SAMAR,
  siga: process.env.DB_SIGA,
  dw: process.env.DB_DW_OLAP,
};

function cleanUrl(raw) { const u = new URL(raw); u.searchParams.delete('sslmode'); return u.toString(); }
async function withDb(key, work) {
  const pool = new Pool({ connectionString: cleanUrl(configs[key]), ssl:{rejectUnauthorized:false}, max:1, connectionTimeoutMillis:15000 });
  try { return await work((sql, params=[]) => pool.query(sql, params)); } finally { await pool.end(); }
}
const scalar = r => Number(r.rows[0]?.value || 0);

async function sourceMetrics(key, definition) {
  return withDb(key, async q => {
    const count = scalar(await q(`SELECT count(*) value FROM ${definition.table}`));
    const nulls = [];
    for (const f of definition.fields) {
      const r = await q(`SELECT count(*) FILTER (WHERE ${f.expr} IS NULL) nulls, count(*) FILTER (WHERE ${f.expr}::text = '') empties FROM ${definition.table}`);
      nulls.push({ fuente:definition.name, tabla:definition.table, campo:f.name, evaluados:count, nulos:Number(r.rows[0].nulls), vacios:Number(r.rows[0].empties) });
    }
    const dup = (await q(definition.duplicateSql)).rows[0];
    const range = (await q(`SELECT min(${definition.date}) fecha_min, max(${definition.date}) fecha_max FROM ${definition.table}`)).rows[0];
    return {
      summary:{ fuente:definition.name, tabla_origen:definition.table.replaceAll('"',''), registros_disponibles:count, fecha_min:range.fecha_min, fecha_max:range.fecha_max, moneda:definition.currency },
      nulls,
      duplicate:{ fuente:definition.name, clave_negocio:definition.duplicateKey, grupos_duplicados:Number(dup.groups||0), filas_involucradas:Number(dup.rows||0), duplicados_excedentes:Number(dup.excess||0) }
    };
  });
}

async function main() {
  fs.mkdirSync(outDir,{recursive:true});
  const started = new Date();
  const defs = {
    castillonv2:{name:'Castillon V2',table:'"VENTAS"',date:'"FECHAVENTA"',currency:'PEN',fields:[{name:'FECHAVENTA',expr:'"FECHAVENTA"'},{name:'DOCUMENTO',expr:'"DOCUMENTO"'},{name:'SUBTOTOTAL',expr:'"SUBTOTOTAL"'},{name:'IGV',expr:'"IGV"'},{name:'TOTALPAGAR',expr:'"TOTALPAGAR"'}],duplicateKey:'DOCUMENTO',duplicateSql:'SELECT count(*) groups,coalesce(sum(c),0) rows,coalesce(sum(c-1),0) excess FROM (SELECT count(*) c FROM "VENTAS" GROUP BY "DOCUMENTO" HAVING count(*)>1)x'},
    veterinaria:{name:'Castillon Veterinaria',table:'"VENTA"',date:'COALESCE("FECH_VENTA","FECCRE")',currency:'PEN',fields:[{name:'FECHA',expr:'COALESCE("FECH_VENTA","FECCRE")'},{name:'IDVENTA',expr:'"IDVENTA"'},{name:'SUBTOTAL',expr:'"SUBTOTAL"'},{name:'IGV',expr:'"IGV"'},{name:'MONTOTOTAL',expr:'"MONTOTOTAL"'}],duplicateKey:'IDVENTA',duplicateSql:'SELECT count(*) groups,coalesce(sum(c),0) rows,coalesce(sum(c-1),0) excess FROM (SELECT count(*) c FROM "VENTA" GROUP BY "IDVENTA" HAVING count(*)>1)x'},
    samar:{name:'Samar Importadora',table:'"VENTAS"',date:'"FECHA"',currency:'CLP (por confirmar documentalmente)',fields:[{name:'FECHA',expr:'"FECHA"'},{name:'DOCUMENTO',expr:'"DOCUMENTO"'},{name:'TOTAL_NETO',expr:'"TOTAL_NETO"'},{name:'IMPUESTO',expr:'"IMPUESTO"'},{name:'TOTAL_DOCUMENTO',expr:'"TOTAL_DOCUMENTO"'}],duplicateKey:'DOCUMENTO',duplicateSql:'SELECT count(*) groups,coalesce(sum(c),0) rows,coalesce(sum(c-1),0) excess FROM (SELECT count(*) c FROM "VENTAS" GROUP BY "DOCUMENTO" HAVING count(*)>1)x'},
    siga:{name:'SIGA 1646',table:'"SIG_ORDEN_ADQUISICION"',date:'"FECHA_ORDEN"',currency:'PEN',fields:[{name:'ANO_EJE',expr:'"ANO_EJE"'},{name:'NRO_ORDEN',expr:'"NRO_ORDEN"'},{name:'FECHA_ORDEN',expr:'"FECHA_ORDEN"'},{name:'PROVEEDOR',expr:'"PROVEEDOR"'},{name:'TOTAL_FACT_SOLES',expr:'"TOTAL_FACT_SOLES"'}],duplicateKey:'ANO_EJE,NRO_ORDEN,TIPO_BIEN,PROVEEDOR',duplicateSql:'SELECT count(*) groups,coalesce(sum(c),0) rows,coalesce(sum(c-1),0) excess FROM (SELECT count(*) c FROM "SIG_ORDEN_ADQUISICION" GROUP BY "ANO_EJE","NRO_ORDEN","TIPO_BIEN","PROVEEDOR" HAVING count(*)>1)x'}
  };
  const sources=[]; for (const [key,d] of Object.entries(defs)) sources.push(await sourceMetrics(key,d));
  const dw = await withDb('dw', async q => {
    const dimensions=(await q(`SELECT 'dim_tiempo' tabla,count(*) registros FROM dim_tiempo UNION ALL SELECT 'dim_empresa',count(*) FROM dim_empresa UNION ALL SELECT 'dim_ubicacion',count(*) FROM dim_ubicacion UNION ALL SELECT 'dim_categoria_item',count(*) FROM dim_categoria_item UNION ALL SELECT 'dim_tipo_pago',count(*) FROM dim_tipo_pago`)).rows;
    const facts=(await q(`SELECT 'fact_ventas_privadas' tabla,count(*) registros,min(t.fecha) fecha_min,max(t.fecha) fecha_max FROM fact_ventas_privadas f JOIN dim_tiempo t USING(id_tiempo) UNION ALL SELECT 'fact_compras_estatales',count(*),min(t.fecha),max(t.fecha) FROM fact_compras_estatales f JOIN dim_tiempo t USING(id_tiempo)`)).rows;
    const privateRows=(await q(`SELECT t.fecha,t.anio,t.mes,t.trimestre,t.dia_semana,e.estrato_tamanio,e.fuente_origen,f.tipo_comprobante,f.nro_comprobante,f.monto_subtotal,f.monto_impuesto,f.monto_total,f.descuento FROM fact_ventas_privadas f JOIN dim_tiempo t USING(id_tiempo) JOIN dim_empresa e USING(id_empresa) ORDER BY t.fecha`)).rows;
    const publicRows=(await q(`SELECT t.fecha,t.anio,t.mes,t.trimestre,e.fuente_origen,f.nro_orden,f.tipo_bien,f.monto_adjudicado,f.cantidad_items,f.precio_unitario,f.flag_proveedor_mype,f.estado_orden FROM fact_compras_estatales f JOIN dim_tiempo t USING(id_tiempo) JOIN dim_empresa e ON e.id_empresa=f.id_proveedor ORDER BY t.fecha`)).rows;
    const logs=(await q(`SELECT id_log,fecha_inicio,fecha_fin,duracion_segundos,filas_castillonv2,filas_veterinaria,filas_samar,filas_siga,total_filas_cargadas,estado,mensaje_error,ejecutado_por FROM etl_log_ejecucion ORDER BY id_log`)).rows;
    const integrity=(await q(`SELECT
      (SELECT count(*) FROM fact_ventas_privadas f LEFT JOIN dim_tiempo t USING(id_tiempo) WHERE t.id_tiempo IS NULL) orphan_time_private,
      (SELECT count(*) FROM fact_ventas_privadas f LEFT JOIN dim_empresa e USING(id_empresa) WHERE e.id_empresa IS NULL) orphan_company_private,
      (SELECT count(*) FROM fact_compras_estatales f LEFT JOIN dim_empresa e ON e.id_empresa=f.id_proveedor WHERE e.id_empresa IS NULL) orphan_provider_public,
      (SELECT coalesce(sum(c-1),0) FROM (SELECT count(*) c FROM fact_ventas_privadas GROUP BY id_tiempo,id_empresa,nro_comprobante,monto_total HAVING count(*)>1)x) duplicate_private,
      (SELECT coalesce(sum(c-1),0) FROM (SELECT count(*) c FROM fact_compras_estatales GROUP BY nro_orden,ano_eje,tipo_bien,id_proveedor HAVING count(*)>1)x) duplicate_public,
      (SELECT count(*) FROM fact_ventas_privadas WHERE monto_total IS NULL OR monto_total<0) invalid_private_amount,
      (SELECT count(*) FROM fact_compras_estatales WHERE monto_adjudicado IS NULL OR monto_adjudicado<0) invalid_public_amount,
      (SELECT count(*) FROM dim_empresa WHERE estrato_tamanio NOT IN ('MICRO','MEDIANA','GRANDE','ESTADO')) invalid_company_class`)).rows[0];
    return {dimensions,facts,privateRows,publicRows,logs,integrity};
  });
  const result={ metadata:{started_at:started.toISOString(),finished_at:new Date().toISOString(),mode:'solo lectura',etl_executed:false,synthetic_test_data_used:false}, sources, dw };
  fs.writeFileSync(path.join(outDir,'resultados_ejecucion.json'),JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(outDir,'registro_ejecucion.log'),`${result.metadata.started_at} INICIO extracción solo lectura\n${result.metadata.finished_at} FIN extracción correcta\n`);
  console.log(JSON.stringify({fuentes:sources.map(x=>x.summary),hechos:dw.facts,dimensiones:dw.dimensions,logs:dw.logs.length},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
