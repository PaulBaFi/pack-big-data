# 6.5 Análisis exploratorio

Fecha de consulta: 2026-11-24T20:23:39.158Z. Se aplicó IQR por fuente y correlación de Spearman sobre agregados mensuales con variación suficiente.

## Valores atípicos

| fuente | variable | q1 | q3 | iqr | limite_inferior | limite_superior | atipicos | porcentaje |
|---|---|---|---|---|---|---|---|---|
| Castillon V2 | monto_total | 17.7 | 86.73 | 69.03 | -85.845 | 190.275 | 10 | 7.937 |
| Castillon Veterinaria | monto_total | 95.34 | 197.96 | 102.62 | -58.59 | 351.89 | 0 | 0.0 |
| Samar Importadora | monto_total | 3213.0 | 13864.0 | 10651.0 | -12763.5 | 29840.5 | 916 | 9.158 |
| SIGA 1646 | monto_adjudicado | 252.0 | 4250.0 | 3998.0 | -5745.0 | 10247.0 | 1463 | 9.028 |

## Correlaciones

| variable_x | variable_y | fuente | metodo | observaciones | coeficiente | valor_p | interpretacion |
|---|---|---|---|---|---|---|---|
| transacciones mensuales | monto mensual | Castillon V2 | Spearman | 6 | 0.8857 | 0.0188 | Asociación, no causalidad |
| transacciones mensuales | monto mensual | SIGA 1646 | Spearman | 109 | 0.7893 | 0.0 | Asociación, no causalidad |
| transacciones mensuales | monto mensual | Samar Importadora | Spearman | 13 | 0.6978 | 0.008 | Asociación, no causalidad |

Los atípicos son observaciones estadísticas, no errores demostrados. No se eliminó ningún dato. La estacionalidad no se afirma cuando no existen ciclos completos suficientes.
