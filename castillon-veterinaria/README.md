# Castillón Veterinaria

Aplicación administrativa funcional para la gestión demostrativa de una veterinaria. Está construida con Astro, React, Tailwind CSS 4, TypeScript estricto y Lucide.

## Ejecutar

```bash
pnpm install
pnpm dev
pnpm build
```

La aplicación no usa backend: la primera carga crea datos ficticios deterministas y los cambios se conservan en `localStorage` bajo `castillon-veterinaria-db-v1`.

## Arquitectura

- `src/pages`: rutas Astro, incluyendo la ruta dinámica para módulos.
- `src/layouts/Layout.astro`: documento HTML base.
- `src/features/VetApp.tsx`: shell administrativo, navegación, vistas operativas y formularios React.
- `src/types/domain.ts`: modelos TypeScript alineados con nombres de tablas y claves de la BD de referencia.
- `src/data/seed.ts`: generador reproducible de datos ficticios relacionados.
- `src/services/storage.ts`: repositorio de persistencia local aislado de la UI.
- `src/styles/global.css`: estilos Tailwind base y CSS de la interfaz.

## Funcionalidad disponible

Dashboard con indicadores, navegación responsive, búsqueda y paginación en módulos de clientes, mascotas, citas, historia clínica, inventario, compras, ventas, caja, promociones y personal. Se pueden crear mascotas, citas, fichas clínicas y productos. Las citas validan conflicto de profesional/horario; inventario evita cantidades negativas en los datos creados; reportes recalculan indicadores desde la base local.

## Decisiones demo y limitaciones

- No hay autenticación real, contraseñas, backend, SQL, ORM, SUNAT ni emisión electrónica.
- El selector de rol y permisos se representa como interfaz demo; no es seguridad.
- IGV se simula al 18% en las semillas. La aplicación no asume reglas tributarias definitivas.
- Las reglas definitivas de stock por almacén, operación tributaria, caja y agenda deben validarse antes de conectar una API.
- La limpieza de datos demo se puede hacer desde DevTools eliminando `castillon-veterinaria-db-v1`.

## Referencias

Los nombres y relaciones principales se basan en `docs/BD_CASTILLON_VETERINARIA.txt` y los RF están trazados en `REQUIREMENTS.md`.
