# Diccionario de indicadores

| Indicador | Definición | Fórmula | Tabla | Campo | Unidad | Periodicidad | Limitación |
|---|---|---|---|---|---|---|---|
| Registros cargados | Filas presentes en la tabla de hechos | COUNT(*) | fact_* | id_hecho | registro | Por ejecución/consulta | Recarga completa |
| Total monetario | Suma por fuente y moneda | SUM(monto) | fact_ventas_privadas / fact_compras_estatales | monto_total / monto_adjudicado | moneda de fuente | Consulta | No sumar monedas distintas |
| Ticket promedio | Media por fila de hecho | AVG(monto) | fact_* | monto_total / monto_adjudicado | moneda por hecho | Consulta | Puede no equivaler a documento único |
| Participación MYPE | Monto MYPE sobre monto estatal | SUM(MYPE)/SUM(total)*100 | fact_compras_estatales | flag_proveedor_mype,monto_adjudicado | porcentaje | Consulta | No MYPE no implica gran empresa |
| Atípicos IQR | Importes fuera de Q1−1.5IQR y Q3+1.5IQR | Regla IQR por fuente | fact_* | monto | registro/porcentaje | Análisis | No prueba error |