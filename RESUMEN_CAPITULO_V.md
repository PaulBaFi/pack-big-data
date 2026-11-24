# CAPÍTULO V. PRUEBAS, INTEGRACIÓN Y VALIDACIÓN

Las pruebas automatizadas se ejecutaron el 24 de noviembre de 2026 sobre esquemas PostgreSQL temporales y aislados creados en las instancias configuradas. Los esquemas fueron eliminados al concluir. La especificación BDD se encuentra en `pruebas/features/capitulo_v.feature`, la trazabilidad en `pruebas/matriz_trazabilidad.csv`, el ejecutor en `admin-olap/scripts/quality_bdd_runner.cjs` y el resultado real en `evidencias/pruebas/resultados_automatizados.json`.

## 5.3 Pruebas OLTP

Se comprobaron operaciones CRUD, rollback, integridad referencial y concurrencia con datos controlados.

Historias asociadas: **HU-OLTP-01**, como operador deseo mantener ventas; **HU-OLTP-02**, como responsable de datos deseo preservar consistencia transaccional. Suite: **S-OLTP**.

| ID Caso | Descripción | Entrada | Proceso | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| OLTP-001 | Inserción | Venta válida | INSERT y consulta | Una fila persistida | Una fila persistida | Aprobado | `evidencias/pruebas/resultados_automatizados.json` |
| OLTP-002 | Actualización | Importe 20 | UPDATE y consulta | Importe actualizado | Importe 20 persistido | Aprobado | Ídem |
| OLTP-003 | Eliminación | Venta existente | DELETE y conteo | Cero filas | Cero filas | Aprobado | Ídem |
| OLTP-004 | Transacción | Venta controlada | INSERT y ROLLBACK | Sin persistencia | Cero filas | Aprobado | Ídem |
| OLTP-005 | Integridad referencial | Cliente 999 inexistente | INSERT inválido | Operación rechazada | PostgreSQL rechazó la FK | Aprobado | Ídem |
| OLTP-006 | Concurrencia | 10 incrementos | UPDATE concurrente | Versión final 10 | Versión final 10 | Aprobado | Ídem |

Resultado: seis de seis casos aprobados. Conclusión: las operaciones controladas conservaron atomicidad, referencia y actualización concurrente.

## 5.4 Pruebas ETL

Se validaron extracción, limpieza, nulos, deduplicación, transformación temporal y carga dimensional idempotente.

Historia asociada: **HU-ETL-01**, como analista deseo transformar ventas confiables para su análisis. Suite: **S-ETL**.

| ID Caso | Descripción | Entrada | Proceso | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| ETL-001 | Extracción | Dos ventas | SELECT de fuente | Dos registros | Dos registros | Aprobado | `evidencias/pruebas/resultados_automatizados.json` |
| ETL-002 | Limpieza | ` QA-001 ` | Trim y mayúsculas | `QA-001` | `QA-001` | Aprobado | Ídem |
| ETL-003 | Duplicados | Lote repetido | Upsert por ID origen | Dos hechos únicos | Dos hechos únicos | Aprobado | Ídem |
| ETL-004 | Nulos | Categoría y total nulos | Valores por defecto y derivación | Datos válidos | `SIN_CATEGORIA` y total 50 | Aprobado | Ídem |
| ETL-005 | Transformación | 2026-11-24 | Conversión de fecha | Clave 20261124 | Clave 20261124 | Aprobado | Ídem |
| ETL-006 | Carga | Lote transformado | Carga de dimensiones y hechos | Relaciones cargadas | Una fecha y dos hechos | Aprobado | Ídem |

Resultado: seis de seis casos aprobados. Conclusión: el flujo controlado transformó y cargó los datos sin duplicación.

## 5.5 Pruebas del Data Warehouse

Se comprobaron conteos, claves dimensionales, medidas y consistencia del esquema estrella.

Historia asociada: **HU-DW-01**, como analista deseo un almacén íntegro y conciliable. Suite: **S-DW**.

| ID Caso | Descripción | Entrada | Proceso | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| DW-001 | Número de registros | Lote cargado | COUNT de hechos | Dos hechos | Dos hechos | Aprobado | `evidencias/pruebas/resultados_automatizados.json` |
| DW-002 | Integridad | Hechos y dimensiones | Búsqueda de huérfanos | Cero huérfanos | Cero huérfanos | Aprobado | Ídem |
| DW-003 | Dimensiones | Fecha controlada | Validación año/mes | 2026/11 | 2026/11 | Aprobado | Ídem |
| DW-004 | Hechos | Montos cargados | Validación nulos/negativos | Cero inválidos | Cero inválidos | Aprobado | Ídem |
| DW-005 | Consistencia | Dos ventas | SUM de hechos | Total 168 | Total 168 | Aprobado | Ídem |

Resultado: cinco de cinco casos aprobados. Conclusión: el modelo controlado mantuvo integridad y consistencia cuantitativa.

## 5.6 Pruebas OLAP

Se evaluaron las operaciones implementadas de agregación, filtro, agrupación multidimensional, desglose temporal y conciliación.

Historia asociada: **HU-OLAP-01**, como analista deseo consultar ventas por dimensiones y verificar sus totales. Suite: **S-OLAP**.

| ID Caso | Descripción | Entrada | Proceso | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| OLAP-001 | Agregación | Hechos cargados | SUM | 168 | 168 | Aprobado | `evidencias/pruebas/resultados_automatizados.json` |
| OLAP-002 | Filtro | Categoría RETAIL | WHERE | Un hecho | Un hecho | Aprobado | Ídem |
| OLAP-003 | Multidimensional | Tiempo y categoría | GROUP BY | Dos celdas | Dos celdas | Aprobado | Ídem |
| OLAP-004 | Drill-down | Año 2026 | Agrupación mensual | Mes 11 | Mes 11 | Aprobado | Ídem |
| OLAP-005 | Conciliación | Origen y hechos | Comparación de conteo y suma | Coincidencia | Conteos y montos coinciden | Aprobado | Ídem |

Resultado: cinco de cinco casos aprobados. Conclusión: las consultas analíticas controladas devolvieron resultados conciliados.

## 5.7 Pruebas Power BI

Se diseñaron pruebas manuales para la conexión, relaciones, medidas DAX, filtros, indicadores y visualizaciones realmente disponibles. No se contó con una sesión autorizada de Power BI ni acceso al modelo semántico; por ello no se inventaron resultados.

Historia asociada: **HU-PBI-01**, como usuario BI deseo consultar indicadores coherentes con el DW. Suite: **S-PBI**.

| ID Caso | Descripción | Entrada | Proceso | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| PBI-001 | Conexión al DW | Credenciales autorizadas | Actualizar modelo | Actualización correcta | Pendiente de acceso | No ejecutado | `pruebas/power-bi/PROCEDIMIENTO_MANUAL.md` |
| PBI-002 | Relaciones | Modelo semántico | Inspeccionar relaciones | Uno a muchos válidas | Pendiente de acceso | No ejecutado | Ídem |
| PBI-003 | Medidas DAX | Medidas implementadas | Comparar con SQL | Valores iguales | Pendiente de acceso | No ejecutado | Ídem |
| PBI-004 | Filtros | Filtros implementados | Aplicar cada filtro | Indicadores coherentes | Pendiente de acceso | No ejecutado | Ídem |
| PBI-005 | Visualizaciones | Reporte actualizado | Revisar indicadores | Sin errores y conciliado | Pendiente de acceso | No ejecutado | Ídem |

Resultado: cinco casos no ejecutados. Conclusión: el procedimiento quedó definido, pero requiere acceso autorizado para producir evidencia válida.

## 5.8 Prueba principal del proyecto

Se definió un único escenario BDD integral para registrar una venta, persistirla, transformarla, cargar dimensiones y hechos, consultar OLAP, actualizar Power BI y conciliar el indicador final.

Historia asociada: **HU-E2E-01**, como responsable del proyecto deseo comprobar la trazabilidad completa de un dato. Suite: **S-E2E**.

| ID Caso | Descripción | Entrada | Proceso | Resultado esperado | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| E2E-001 | Flujo OLTP–ETL–DW–OLAP–Power BI | Venta controlada | Persistencia, ETL, carga, consulta y visualización | Mismo importe en todas las capas | OLTP–ETL–DW–OLAP verificados en casos automatizados; tramo Power BI sin acceso autorizado | Bloqueado | `pruebas/features/capitulo_v.feature`; `pruebas/power-bi/PROCEDIMIENTO_MANUAL.md` |

Resultado: el tramo automatizable previo a Power BI fue validado; el escenario integral permanece bloqueado y no se declara aprobado. Conclusión: falta ejecutar la actualización y conciliación final en Power BI con una cuenta autorizada.

## Consolidado

| Componente | Suites | Casos | Aprobados | Fallidos | Bloqueados | No ejecutados | % Aprobación |
|---|---|---|---|---|---|---|---|
| OLTP | 1 | 6 | 6 | 0 | 0 | 0 | 100.00% |
| ETL | 1 | 6 | 6 | 0 | 0 | 0 | 100.00% |
| Data Warehouse | 1 | 5 | 5 | 0 | 0 | 0 | 100.00% |
| OLAP | 1 | 5 | 5 | 0 | 0 | 0 | 100.00% |
| Power BI | 1 | 5 | 0 | 0 | 0 | 5 | 0.00% |
| End-to-End | 1 | 1 | 0 | 0 | 1 | 0 | 0.00% |
| Total | 6 | 28 | 22 | 0 | 1 | 5 | 78.57% |
