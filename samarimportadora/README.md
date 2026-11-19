# SamarImportadora

MVP administrativo construido con Astro, React, TypeScript, Tailwind CSS, Lucide React y Recharts.

## Ejecutar

```bash
pnpm install
pnpm run dev
pnpm run check
pnpm run build
```

La aplicación inicializa datos ficticios en `localStorage` únicamente cuando no existe información previa. Las operaciones de clientes, artículos, vendedores, sucursales y ventas se mantienen en el navegador. El impuesto de 18% es sólo un supuesto configurable para demostración.

No hay autenticación, backend ni conexión a SQL Server. Para producción se debe reemplazar `src/data/repository.ts` por un adaptador HTTP y añadir validaciones/transacciones en la API.
