-- Ventas privadas separadas por fuente/estrato; no sumar sin confirmar moneda.
SELECT e.fuente_origen, e.estrato_tamanio,
       count(*) transacciones, sum(f.monto_total) total,
       avg(f.monto_total) media, min(f.monto_total) minimo, max(f.monto_total) maximo
FROM fact_ventas_privadas f JOIN dim_empresa e USING(id_empresa)
GROUP BY e.fuente_origen,e.estrato_tamanio;

-- Evolución mensual de ventas privadas.
SELECT e.fuente_origen,t.anio,t.mes,count(*) transacciones,
       sum(f.monto_total) total,avg(f.monto_total) ticket
FROM fact_ventas_privadas f
JOIN dim_empresa e USING(id_empresa) JOIN dim_tiempo t USING(id_tiempo)
GROUP BY e.fuente_origen,t.anio,t.mes ORDER BY e.fuente_origen,t.anio,t.mes;

-- Compras estatales y participación MYPE.
SELECT flag_proveedor_mype,count(*) ordenes,sum(monto_adjudicado) monto,
       avg(monto_adjudicado) promedio,min(monto_adjudicado),max(monto_adjudicado)
FROM fact_compras_estatales GROUP BY flag_proveedor_mype;
