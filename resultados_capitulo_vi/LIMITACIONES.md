# Limitaciones

- La moneda de Samar no está almacenada en el esquema dimensional y debe confirmarse documentalmente.
- El ETL no registra conteos por regla de transformación, descarte ni etapa; esas métricas son no disponibles.
- La recarga completa impide reconstruir históricamente qué filas fueron reemplazadas en cada ejecución.
- Categoría, ubicación y método de pago usan asignaciones genéricas en la implementación TypeScript; limitan el análisis detallado.
- Una fila de hecho se trata como transacción extraída; no se validó que equivalga siempre a un documento comercial único.
- Los controles de integridad cubren reglas estructurales, no exactitud semántica completa.
- No se ejecutó ETL ni se modificaron datos históricos.
