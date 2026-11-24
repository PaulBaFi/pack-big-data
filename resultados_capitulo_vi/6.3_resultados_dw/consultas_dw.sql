-- Conteos y cobertura de hechos.
SELECT count(*) registros, min(t.fecha), max(t.fecha)
FROM fact_ventas_privadas f JOIN dim_tiempo t USING (id_tiempo);
SELECT count(*) registros, min(t.fecha), max(t.fecha)
FROM fact_compras_estatales f JOIN dim_tiempo t USING (id_tiempo);

-- Conteos dimensionales.
SELECT 'dim_tiempo', count(*) FROM dim_tiempo
UNION ALL SELECT 'dim_empresa', count(*) FROM dim_empresa
UNION ALL SELECT 'dim_ubicacion', count(*) FROM dim_ubicacion
UNION ALL SELECT 'dim_categoria_item', count(*) FROM dim_categoria_item
UNION ALL SELECT 'dim_tipo_pago', count(*) FROM dim_tipo_pago;

-- Duplicados según claves usadas por la auditoría.
SELECT id_tiempo,id_empresa,nro_comprobante,monto_total,count(*)
FROM fact_ventas_privadas
GROUP BY id_tiempo,id_empresa,nro_comprobante,monto_total HAVING count(*) > 1;
SELECT nro_orden,ano_eje,tipo_bien,id_proveedor,count(*)
FROM fact_compras_estatales
GROUP BY nro_orden,ano_eje,tipo_bien,id_proveedor HAVING count(*) > 1;

-- Integridad referencial independiente.
SELECT count(*) FROM fact_ventas_privadas f
LEFT JOIN dim_tiempo t USING(id_tiempo) WHERE t.id_tiempo IS NULL;
SELECT count(*) FROM fact_compras_estatales f
LEFT JOIN dim_empresa e ON e.id_empresa=f.id_proveedor WHERE e.id_empresa IS NULL;
