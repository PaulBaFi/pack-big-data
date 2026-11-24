# 6.3 Resultados del Data Warehouse

Fecha de consulta: 2026-11-24T20:23:39.158Z. Modelo con 2 tablas de hechos y 5 dimensiones.

## Hechos

| tabla | registros | fecha_min | fecha_max | proceso_negocio | granularidad |
|---|---|---|---|---|---|
| fact_ventas_privadas | 10209 | 2015-01-02T05:00:00.000Z | 2026-11-24T05:00:00.000Z | Ventas privadas | Una fila por venta/documento extraído |
| fact_compras_estatales | 16205 | 2016-06-16T05:00:00.000Z | 2026-11-24T05:00:00.000Z | Compras estatales | Una fila por orden de adquisición extraída |

## Dimensiones

| tabla | registros | clave_primaria | atributos_principales | tabla_hechos_relacionada |
|---|---|---|---|---|
| dim_tiempo | 4383 | id_tiempo | fecha, año, mes, trimestre, semestre | Ambas tablas de hechos |
| dim_empresa | 1377 | id_empresa | código origen, razón social, estrato, MYPE | Ambas tablas de hechos |
| dim_ubicacion | 3 | id_ubicacion | departamento, provincia, distrito, país | Ambas tablas de hechos |
| dim_categoria_item | 6 | id_categoria | código, nombre, categoría, rubro | Ambas tablas de hechos |
| dim_tipo_pago | 7 | id_tipo_pago | método, tipo transacción | fact_ventas_privadas |

## Integridad

| codigo | control | registros_evaluados | incidencias | cumplimiento_pct | estado |
|---|---|---|---|---|---|
| INT-001 | Huérfanos tiempo ventas | 10209 | 0 | 100.0 | APROBADO |
| INT-002 | Huérfanos empresa ventas | 10209 | 0 | 100.0 | APROBADO |
| INT-003 | Huérfanos proveedor compras | 16205 | 0 | 100.0 | APROBADO |
| INT-004 | Duplicados hechos ventas | 10209 | 0 | 100.0 | APROBADO |
| INT-005 | Duplicados hechos compras | 16205 | 0 | 100.0 | APROBADO |
| INT-006 | Importes inválidos ventas | 10209 | 0 | 100.0 | APROBADO |
| INT-007 | Importes inválidos compras | 16205 | 0 | 100.0 | APROBADO |
| INT-008 | Clasificaciones inválidas | 5 | 0 | 100.0 | APROBADO |

Los controles ejecutados no encontraron incidencias, pero esto no equivale a certificar calidad total: no cubren exactitud semántica ni monedas.
