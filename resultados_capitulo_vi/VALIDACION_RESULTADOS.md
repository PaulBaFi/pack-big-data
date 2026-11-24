# Validación de resultados

Fecha de validación: 24 de noviembre de 2026.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Conteos de origen | 26 415 registros en cuatro fuentes | `6.2_resultados_etl/registros_extraidos.csv` |
| Conteos del DW | 26 414 hechos: 10 209 ventas y 16 205 compras | `6.3_resultados_dw/tablas_hechos.csv` |
| Conciliación | Tres fuentes coinciden; Castillon V2 difiere en una fila sin fecha | `6.3_resultados_dw/conciliacion.csv` |
| Datos sintéticos del capítulo V | No utilizados; aquellos casos operaron en esquemas temporales eliminados | `evidencias/resultados_ejecucion.json` |
| Modificación histórica | No realizada; extracción exclusivamente de lectura | `evidencias/registro_ejecucion.log` |
| Monedas | Fuentes PEN separadas de Samar; moneda de Samar no confirmada | `LIMITACIONES.md` |
| Porcentajes | Recalculados desde frecuencias y conteos mediante Python | `scripts/generar_resultados.py` |
| Tablas y gráficos | Generados desde los mismos DataFrames | `scripts/generar_resultados.py` |
| Valores faltantes | Conservados o marcados como “No disponible”; no sustituidos arbitrariamente por cero | CSV e informe consolidado |
| Integridad estructural | Ocho controles consultados; cero incidencias en el momento de extracción | `6.3_resultados_dw/integridad.csv` |
| Reproducibilidad | Extractor Node, consultas SQL y análisis Python incluidos | `scripts/` y archivos `consultas_*.sql` |

La validación automatizada confirmó que la suma de filas de las tablas de hechos es 26 414, que el total de filas disponibles en origen es 26 415 y que el archivo Excel y el ZIP se generaron correctamente. Los controles no demuestran por sí solos exactitud semántica absoluta.
