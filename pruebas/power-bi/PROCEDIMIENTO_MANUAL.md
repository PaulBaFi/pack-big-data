# Validación manual de Power BI

Estas pruebas no se consideran ejecutadas hasta completar el procedimiento con una cuenta autorizada y guardar capturas sin datos sensibles en `evidencias/pruebas/power-bi/`.

1. Abrir `admin-olap/src/pages/reportes-bi.astro` mediante el portal autenticado y acceder al reporte con una cuenta autorizada.
2. Ejecutar una actualización del modelo y registrar fecha, hora, estado y filas procesadas (`PBI-001`).
3. En la vista de modelo, comprobar las relaciones uno-a-muchos entre dimensiones y hechos (`PBI-002`).
4. Para cada medida DAX realmente presente, registrar su valor y compararlo con una consulta SQL equivalente al DW (`PBI-003`).
5. Aplicar individualmente cada filtro implementado y verificar que los indicadores relacionados cambien de forma coherente (`PBI-004`).
6. Revisar que las visualizaciones carguen sin errores y conciliar al menos un indicador con el DW (`PBI-005`).
7. Para `E2E-001`, usar el identificador controlado de la ejecución, actualizar Power BI y conciliar el importe final con OLTP, ETL, hecho y consulta OLAP.

Registrar cada caso como `APROBADO`, `FALLIDO` o `BLOQUEADO`; nunca inferir el resultado a partir de que el iframe cargue.
