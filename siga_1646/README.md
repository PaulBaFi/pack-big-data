# Astro Starter Kit: Basics

```sh
pnpm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
# SIGA 1646 · MVP administrativo

Aplicación web de demostración para gestión administrativa pública, construida con Astro, React, TypeScript y CSS responsive. Los datos son ficticios, deterministas y se guardan en `localStorage` cuando el usuario crea registros.

## Ejecutar

```bash
pnpm install
pnpm dev
pnpm build
```

Rutas disponibles: `/` (dashboard), `/catalogos`, `/institucion`, `/necesidades`, `/programacion`, `/pedidos`, `/cotizaciones`, `/ordenes`, `/contratistas`, `/contratos`, `/presupuesto`, `/devengados`, `/almacenes`, `/kardex`, `/inventarios`, `/patrimonio`, `/asignaciones`, `/seguridad`, `/seguimiento` y `/reportes`.

## Decisiones y limitaciones

- `src/data/mock/generators.ts` contiene las 46 tablas del anexo, sus PK de presentación y 20 registros reproducibles por tabla; las pantallas muestran los campos principales del diccionario para mantener el MVP legible.
- `src/data/repositories/mockRepository.ts` mantiene una frontera async y persistencia SSR-safe en localStorage; no hay SQL Server, ORM, API ni credenciales reales.
- Las relaciones cabecera-detalle, aprobaciones, presupuesto, valorización y auditoría se rotulan como simulación pendiente de validación normativa. Las pestañas relacionadas son una vista de prototipo y no inventan FK.
- El alta disponible genera registros y conserva los cambios al recargar. Las consultas cuentan con búsqueda, paginación, detalle tabular y exportación visual de demo.

## Matriz RF

| RF | Pantalla | Estado |
|---|---|---|
| 001–003 | Catálogos / Institución | Implementado, mocks |
| 004–005 | Necesidades / Programación | Implementado, aprobación simulada |
| 006–008 | Pedidos / Cotizaciones / Órdenes | Implementado |
| 009–010 | Contratistas / Contratos | Implementado |
| 011–012 | Presupuesto / Devengados | Implementado, consulta |
| 013–015 | Almacenes / Kardex / Inventarios | Implementado |
| 016–017 | Patrimonio / Asignaciones | Implementado, consulta/alta demo |
| 018–019 | Seguridad / Seguimiento | Implementado, sin contraseñas reales |
| 020 | Reportes | Implementado con indicadores derivados de mocks |

Todos los indicadores incluyen datos de demostración y no son cifras oficiales.
