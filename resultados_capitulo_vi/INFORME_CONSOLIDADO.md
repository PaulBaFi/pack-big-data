# Informe consolidado del capítulo VI

## Entorno y alcance

Extracción: 2026-11-24T20:23:39.158Z; modo: solo lectura; ETL no ejecutado. Fuentes: Castillon V2, Castillon Veterinaria, Samar Importadora y SIGA 1646. Periodo efectivo: 2015-01-02 a 2026-11-24. Castillon y SIGA se tratan como PEN; Samar queda separado porque su moneda no está documentada en el DW.

## 6.2 ETL

| fuente | tabla_origen | registros_disponibles | registros_extraidos | diferencia | tabla_destino |
|---|---|---|---|---|---|
| Castillon V2 | VENTAS | 127 | 126 | 1 | fact_ventas_privadas |
| Castillon Veterinaria | VENTA | 81 | 81 | 0 | fact_ventas_privadas |
| Samar Importadora | VENTAS | 10002 | 10002 | 0 | fact_ventas_privadas |
| SIGA 1646 | SIG_ORDEN_ADQUISICION | 16205 | 16205 | 0 | fact_compras_estatales |

Ejecuciones: 13 totales, 8 completadas. Duración completada mínima/promedio/máxima: 5.55/19.24/93.29 s. Los descartes y transformaciones por regla no están instrumentados.

## 6.3 Data Warehouse

| tabla | registros | fecha_min | fecha_max | proceso_negocio | granularidad |
|---|---|---|---|---|---|
| fact_ventas_privadas | 10209 | 2015-01-02T05:00:00.000Z | 2026-11-24T05:00:00.000Z | Ventas privadas | Una fila por venta/documento extraído |
| fact_compras_estatales | 16205 | 2016-06-16T05:00:00.000Z | 2026-11-24T05:00:00.000Z | Compras estatales | Una fila por orden de adquisición extraída |

| tabla | registros | clave_primaria | atributos_principales | tabla_hechos_relacionada |
|---|---|---|---|---|
| dim_tiempo | 4383 | id_tiempo | fecha, año, mes, trimestre, semestre | Ambas tablas de hechos |
| dim_empresa | 1377 | id_empresa | código origen, razón social, estrato, MYPE | Ambas tablas de hechos |
| dim_ubicacion | 3 | id_ubicacion | departamento, provincia, distrito, país | Ambas tablas de hechos |
| dim_categoria_item | 6 | id_categoria | código, nombre, categoría, rubro | Ambas tablas de hechos |
| dim_tipo_pago | 7 | id_tipo_pago | método, tipo transacción | fact_ventas_privadas |

Los 8 controles estructurales reportaron 0 incidencias. Esto no implica calidad absoluta.

## 6.4 Estadística descriptiva

| fuente | variable | n | total | media | mediana | desviacion_estandar | minimo | q1 | q3 | maximo | moneda |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Castillon V2 | monto_total | 126 | 9408.33 | 74.67 | 42.48 | 95.25 | 4.0 | 17.7 | 86.73 | 490.88 | PEN |
| Castillon Veterinaria | monto_total | 81 | 12281.05 | 151.62 | 155.64 | 65.52 | 42.72 | 95.34 | 197.96 | 288.23 | PEN |
| Samar Importadora | monto_total | 10002 | 145223887.0 | 14519.48 | 6304.5 | 27303.18 | 334.0 | 3213.0 | 13864.0 | 235180.0 | CLP no confirmado |
| SIGA 1646 | monto_adjudicado | 16205 | 62540042.58 | 3859.31 | 1050.0 | 9452.18 | 0.6 | 252.0 | 4250.0 | 399000.0 | PEN |

## 6.5 EDA

| fuente | variable | q1 | q3 | iqr | limite_inferior | limite_superior | atipicos | porcentaje |
|---|---|---|---|---|---|---|---|---|
| Castillon V2 | monto_total | 17.7 | 86.73 | 69.03 | -85.84 | 190.27 | 10 | 7.94 |
| Castillon Veterinaria | monto_total | 95.34 | 197.96 | 102.62 | -58.59 | 351.89 | 0 | 0.0 |
| Samar Importadora | monto_total | 3213.0 | 13864.0 | 10651.0 | -12763.5 | 29840.5 | 916 | 9.16 |
| SIGA 1646 | monto_adjudicado | 252.0 | 4250.0 | 3998.0 | -5745.0 | 10247.0 | 1463 | 9.03 |

| variable_x | variable_y | fuente | metodo | observaciones | coeficiente | valor_p | interpretacion |
|---|---|---|---|---|---|---|---|
| transacciones mensuales | monto mensual | Castillon V2 | Spearman | 6 | 0.8857 | 0.0188 | Asociación, no causalidad |
| transacciones mensuales | monto mensual | SIGA 1646 | Spearman | 109 | 0.7893 | 0.0 | Asociación, no causalidad |
| transacciones mensuales | monto mensual | Samar Importadora | Spearman | 13 | 0.6978 | 0.008 | Asociación, no causalidad |

## Hallazgos y conclusiones

- El DW contiene 26,414 hechos y 5,776 filas dimensionales.
- Tres fuentes concilian por conteo; Castillon V2 difiere en una fila sin fecha, omitida por el ETL.
- El origen Castillon V2 contiene 118 duplicados excedentes según `DOCUMENTO`, mientras el DW no presenta duplicados según la clave compuesta de auditoría; ambas reglas no son equivalentes.
- Las comparaciones monetarias entre Samar y fuentes PEN no son válidas hasta confirmar moneda o definir conversión.
- Los atípicos IQR deben investigarse, no eliminarse automáticamente.

Consultas reproducibles: `6.2_resultados_etl/consultas_etl.sql`, `6.3_resultados_dw/consultas_dw.sql` y `6.4_analisis_descriptivo/consultas_descriptivas.sql`.
