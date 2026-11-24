# Corrección y validación de Samar Importadora

## Cambios principales

- PostgreSQL es la única fuente de datos de la aplicación. Una falla de conexión se muestra y no activa semillas ni `localStorage`.
- `/api/data` acepta sólo entidades y columnas declaradas, usa parámetros, valida tipos y obligatorios, pagina y busca en servidor, genera claves y permite altas/ediciones.
- `/api/ventas` valida las relaciones, vuelve a obtener precios, recalcula neto/impuesto/total y registra cabecera y detalles en una transacción.
- `/api/dashboard` calcula indicadores y reportes sobre todos los registros en PostgreSQL, no sobre una página.
- Se retiraron las acciones de eliminación de registros históricos.
- Los formularios no solicitan claves internas; sucursal usa un selector de comuna y ventas usa selectores de cliente, vendedor, sucursal y artículo.

## Preparación de base de ensayo

1. Crear un clon o esquema de ensayo de la base Samar. No usar la base histórica para pruebas destructivas.
2. Ejecutar `npm run db:migrate`. El comando aplica `migrations/001_samar_sequences.sql` de forma idempotente y verifica las diez secuencias requeridas.
3. Ejecutar `npm run db:migrate:check` en la validación posterior al despliegue.
4. Configurar `DATABASE_URL` exclusivamente en el entorno, nunca en el repositorio.
5. Ejecutar `npm run check`, `npm test` y `npm run build`.

## Matriz de pruebas

| Prueba | Resultado esperado | Resultado obtenido |
|---|---|---|
| Análisis TypeScript/Astro | Sin errores | Aprobado: 0 errores |
| Build de producción | Artefacto server generado | Aprobado |
| Cálculos de venta | Neto, 18% y total consistentes | Aprobado por prueba unitaria |
| Tabla/columna no permitida | HTTP 400 | Cubierto por contrato; pendiente integración DB |
| Alta y edición por entidad | Persistencia confirmada por `RETURNING` | Pendiente conexión DB de ensayo |
| ID concurrente | Valores únicos de secuencia | Pendiente prueba concurrente DB |
| Venta válida | COMMIT de cabecera y detalles | Pendiente conexión DB de ensayo |
| Venta inválida | ROLLBACK sin cabecera parcial | Pendiente conexión DB de ensayo |
| Recarga | Datos recuperados de PostgreSQL | Pendiente ejecución navegador con DB |
| Dashboard/reportes | Agregados de toda la tabla | Consulta implementada; pendiente cotejo DB |
| Compatibilidad ETL | Se conservan tablas/columnas consumidas | Verificado estáticamente contra `etl_pipeline.py` |

## Limitaciones pendientes

- El repositorio no contiene el DDL original de Samar y el entorno de revisión no proporciona `DATABASE_URL`; no fue posible contrastar restricciones ni ejecutar escrituras reales.
- Región, provincia y comuna continúan como consulta en la pantalla de geografía. La API soporta alta y edición, pero falta exponer sus formularios dependientes en esa pantalla.
- La edición de ventas no se habilitó porque no existe una regla comercial documentada para documentos ya emitidos.
- Los listados iniciales cargan hasta 100 filas para mantener el diseño existente; la API ya ofrece paginación real, pero falta conectar el control visual en todas las pantallas.
