# CastillónV2

Panel administrativo demostrativo para gestión de restaurante construido con Astro, React, TypeScript, Tailwind CSS y `localStorage`.

## Ejecutar

```bash
pnpm install
pnpm run dev
pnpm run build
```

## Alcance

Incluye dashboard, clientes, productos, mesas y pedidos, ventas, comprobantes simulados, finanzas, personal, ubicación, reportes y configuración. Los datos se inicializan de forma determinista y se guardan en `localStorage`; configuración permite restablecer la demo.

La tasa IGV usada en la demostración es 18% y se calcula como `IGV = SUBTOTOTAL × 0.18`, `TOTALPAGAR = SUBTOTOTAL + IGV`. La venta se asume provisionalmente como pedido completo. Los códigos de estado se muestran sin afirmar equivalencias definitivas con SQL Server. No se implementa autenticación real ni integración SUNAT.
