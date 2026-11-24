-- Consultas ejecutadas en modo de solo lectura el 2026-11-24.
-- Ejecutar cada bloque en la base indicada.

-- Castillon V2
SELECT count(*) FROM "VENTAS";
SELECT min("FECHAVENTA"), max("FECHAVENTA") FROM "VENTAS";
SELECT count(*) AS grupos, sum(c) AS filas, sum(c-1) AS excedentes
FROM (SELECT count(*) c FROM "VENTAS" GROUP BY "DOCUMENTO" HAVING count(*) > 1) x;

-- Castillon Veterinaria
SELECT count(*), min(COALESCE("FECH_VENTA","FECCRE")), max(COALESCE("FECH_VENTA","FECCRE")) FROM "VENTA";

-- Samar Importadora
SELECT count(*), min("FECHA"), max("FECHA") FROM "VENTAS";

-- SIGA 1646
SELECT count(*), min("FECHA_ORDEN"), max("FECHA_ORDEN") FROM "SIG_ORDEN_ADQUISICION";

-- Data Warehouse: historial de ejecuciones
SELECT id_log, fecha_inicio, fecha_fin, duracion_segundos,
       filas_castillonv2, filas_veterinaria, filas_samar, filas_siga,
       total_filas_cargadas, estado, mensaje_error, ejecutado_por
FROM etl_log_ejecucion ORDER BY id_log;
