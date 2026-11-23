# Portal de Administración Centralizada & Auditoría OLAP (`AdminOlap`)
**Universidad Privada San Juan Bautista - Proyecto Final Big Data**

Aplicación web administrativa profesional construida en **Astro 7 (SSR)** con **React 19**, **Tailwind CSS v4** y adaptada para despliegue serverless en **Vercel** (`@astrojs/vercel`).

---

## 🌟 Funcionalidades Principales

### 1. Centro de Control & Orquestación ETL
* **Ejecución Bajo Demanda:** Disparo manual con seguimiento en tiempo real de las 7 fases de ingesta dimensional y terminal de logs.
* **Configuración de Frecuencia:** Ajuste dinámico de periodicidad (Cada 1 h, 6 h, 12 h, Diario a las 00:00 UTC, Semanal) persistido en `etl_configuracion`.
* **Automatización Serverless en Vercel:** Cron job nativo configurado en `vercel.json` (`schedule: "0 0 * * *"` apuntando a `/api/etl/cron`).
* **Auditoría de Ejecuciones:** Historial tabular completo de `etl_log_ejecucion` con filas cargadas por empresa y estado.

### 2. Monitoreo en Vivo de los 4 Sistemas Fuente (OLTP)
* **Medición de Latencia & Salud:** Pings en tiempo real a las 4 bases de datos en Aiven PostgreSQL:
  - **Castillon V2:** Microempresa (Restaurante)
  - **Castillon Veterinaria:** Mediana Empresa (Clínica)
  - **Samar Importadora:** Gran Empresa (Mayorista B2B)
  - **SIGA 1646:** Sector Público (MEF / Adquisiciones del Estado)
* **Detección Instantánea de Pendientes:** Cálculo en vivo de `Delta = Registros OLTP - Hechos OLAP`. Alertas automáticas ante nuevos registros transaccionales pendientes de procesar.
* **Explorador de Transacciones:** Vista previa interactiva de las últimas ventas u órdenes con sellos de sincronización.

### 3. Supervisión de BD OLAP, Auditoría de Calidad & Conciliación
* **Visor del Star Schema:** Conteo y distribución de 5 tablas dimensionales y 2 tablas de hechos (`fact_ventas_privadas` y `fact_compras_estatales`).
* **Auditor de Calidad Automatizado:**
  - `AUD-001`: Control de duplicados en ventas privadas (Unicidad transaccional).
  - `AUD-002`: Control de duplicados en compras SIGA (Unicidad de órdenes de adquisición).
  - `AUD-003`: Integridad referencial dimensional (Cero registros huérfanos).
  - `AUD-004`: Normalización y validación de montos monetarios.
  - `AUD-005`: Normalización de estratos empresariales y taxonomía MYPE.
  - `AUD-006`: Consistencia temporal en calendario 2015-2026.
* **Certificado de Sincronización Post-ETL:** Matriz de conciliación formal 1:1 que valida la coincidencia matemática exacta del 100.00% de los registros entre los 4 sistemas origen y el Data Warehouse.

### 4. Seguridad & Autenticación Profesional
* **Sesiones Seguras:** Tokens JWT firmados con algoritmo HS256 transmitidos exclusivamente mediante cookies `HttpOnly`, `SameSite=Lax` y `Secure`.
* **Protección de Rutas:** Middleware SSR interceptor (`src/middleware.ts`) que valida credenciales y roles (`SUPERADMIN`, `AUDITOR_ETL`).
* **Protección Brute-Force:** Bloqueo temporal de cuentas tras 5 intentos fallidos consecutivos.
* **Trazabilidad:** Registro de todas las acciones administrativas en la tabla `admin_audit_logs`.

---

## 🔑 Credenciales de Acceso Semilla

Para evaluación y demostración:
* **Usuario:** `admin@bigdata.upsjb.edu.pe`
* **Contraseña:** `Admin2026*`
* **Rol:** `SUPERADMIN`

*(La pantalla de login incluye un botón de un clic para autocompletar estas credenciales).*

---

## 🚀 Despliegue en Vercel

1. En el dashboard de **Vercel**, haz clic en **Add New... -> Project**.
2. Selecciona el repositorio de GitHub: `PaulBaFi/pack-big-data`.
3. En la sección **Root Directory**, haz clic en **Edit** y selecciona la carpeta: `admin-olap`.
4. El Framework Preset detectará automáticamente **Astro**.
5. En la sección **Environment Variables**, añade las siguientes variables:

```bash
DB_CASTILLONV2="postgres://avnadmin:TU_PASSWORD_AIVEN@pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com:16290/castillonv2"
DB_VETERINARIA="postgres://avnadmin:TU_PASSWORD_AIVEN@pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com:16290/castillon_veterinaria"
DB_SAMAR="postgres://avnadmin:TU_PASSWORD_AIVEN@pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com:16290/samar_importadora"
DB_SIGA="postgres://avnadmin:TU_PASSWORD_AIVEN@pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com:16290/siga_1646"
DB_DW_OLAP="postgres://avnadmin:TU_PASSWORD_AIVEN@pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com:16290/dw_empresas_olap"
AIVEN_PASSWORD="TU_PASSWORD_AIVEN"
JWT_SECRET="super_secret_jwt_key_bigdata_upsjb_2026_olap_admin_secure"
CRON_SECRET="cron_bigdata_secret_2026"
```

6. Haz clic en **Deploy**. ¡El portal estará en línea en segundos con Vercel Cron activo a medianoche!
