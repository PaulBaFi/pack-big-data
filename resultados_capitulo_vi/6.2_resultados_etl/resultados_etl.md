# 6.2 Resultados del proceso ETL

Fecha de consulta: 2026-11-24T20:23:39.158Z. La implementación activa es `admin-olap/src/lib/etl-engine.ts`, invocada por `/api/etl/run` y por el cron. Se confirmó recarga completa mediante `TRUNCATE`; no se ejecutó durante este análisis.

## Extracción y carga

| fuente | tabla_origen | registros_disponibles | registros_extraidos | diferencia | tabla_destino |
|---|---|---|---|---|---|
| Castillon V2 | VENTAS | 127 | 126 | 1 | fact_ventas_privadas |
| Castillon Veterinaria | VENTA | 81 | 81 | 0 | fact_ventas_privadas |
| Samar Importadora | VENTAS | 10002 | 10002 | 0 | fact_ventas_privadas |
| SIGA 1646 | SIG_ORDEN_ADQUISICION | 16205 | 16205 | 0 | fact_compras_estatales |

El total disponible fue 26,415 y el DW contiene 26,414 hechos atribuibles. Castillon V2 presenta una diferencia de una fila por fecha nula y por la regla `if (!f) continue`. Las cantidades de registros únicos transformados y descartes históricos no están instrumentadas; se indican como no disponibles.

## Duplicados

| fuente | clave_negocio | grupos_duplicados | filas_involucradas | duplicados_excedentes | duplicados_eliminados | duplicados_restantes |
|---|---|---|---|---|---|---|
| Castillon V2 | DOCUMENTO | 2 | 120 | 118 | No disponible | 0 en DW según clave de auditoría |
| Castillon Veterinaria | IDVENTA | 0 | 0 | 0 | No disponible | 0 en DW según clave de auditoría |
| Samar Importadora | DOCUMENTO | 0 | 0 | 0 | No disponible | 0 en DW según clave de auditoría |
| SIGA 1646 | ANO_EJE,NRO_ORDEN,TIPO_BIEN,PROVEEDOR | 0 | 0 | 0 | No disponible | 0 en DW según clave de auditoría |

## Ejecuciones

Se registraron 13 ejecuciones: 8 completadas y 5 con error. En completadas, duración mínima 5.55 s, máxima 93.29 s y promedio 19.24 s.
