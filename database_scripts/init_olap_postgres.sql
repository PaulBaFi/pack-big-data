-- ==============================================================================
-- Script DDL: Modelo Dimensional OLAP (Data Warehouse) en PostgreSQL (Aiven)
-- Base de Datos: DW_Empresas_OLAP / defaultdb
-- Objetivo: Benchmarking comparativo Micro, Mediana, Gran Empresa y Sector Publico (SIGA)
-- ==============================================================================

-- 1. Tabla de Control y Frecuencia de la ETL
CREATE TABLE IF NOT EXISTS etl_configuracion (
    id SERIAL PRIMARY KEY,
    frecuencia_sugerida VARCHAR(50) DEFAULT 'DIARIO', -- 'CADA_6_HORAS', 'CADA_12_HORAS', 'DIARIO', 'SEMANAL'
    intervalo_horas INT DEFAULT 24,
    permitir_ejecucion_manual BOOLEAN DEFAULT TRUE,
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuracion por defecto
INSERT INTO etl_configuracion (frecuencia_sugerida, intervalo_horas, permitir_ejecucion_manual)
SELECT 'DIARIO', 24, TRUE
WHERE NOT EXISTS (SELECT 1 FROM etl_configuracion);

-- 2. Tabla de Auditoria de Ejecucion de la ETL (Disparada por el boton manual o cron)
CREATE TABLE IF NOT EXISTS etl_log_ejecucion (
    id_log BIGSERIAL PRIMARY KEY,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    duracion_segundos NUMERIC(8,2),
    estado VARCHAR(20) NOT NULL, -- 'EN_PROCESO', 'COMPLETADO', 'ERROR'
    filas_castillonv2 INT DEFAULT 0,
    filas_veterinaria INT DEFAULT 0,
    filas_samar INT DEFAULT 0,
    filas_siga INT DEFAULT 0,
    total_filas_cargadas INT DEFAULT 0,
    mensaje_error TEXT,
    ejecutado_por VARCHAR(50) DEFAULT 'BOTON_MANUAL'
);

-- 3. Dimension Tiempo (Granularidad diaria con jerarquias de calendario)
CREATE TABLE IF NOT EXISTS dim_tiempo (
    id_tiempo INT PRIMARY KEY, -- Formato YYYYMMDD (ej. 20261121)
    fecha DATE NOT NULL UNIQUE,
    anio INT NOT NULL,
    mes INT NOT NULL,
    nombre_mes VARCHAR(20) NOT NULL,
    trimestre INT NOT NULL,
    semestre INT NOT NULL,
    dia_semana VARCHAR(20) NOT NULL,
    es_fin_semana BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_tiempo_fecha ON dim_tiempo(fecha);
CREATE INDEX IF NOT EXISTS idx_dim_tiempo_anio_mes ON dim_tiempo(anio, mes);

-- 4. Dimension Empresa y Proveedor (Estrato empresarial)
CREATE TABLE IF NOT EXISTS dim_empresa (
    id_empresa SERIAL PRIMARY KEY,
    codigo_origen VARCHAR(100), -- RUC o ID en base origen
    razon_social VARCHAR(255) NOT NULL,
    estrato_tamanio VARCHAR(30) NOT NULL, -- 'MICRO', 'MEDIANA', 'GRANDE', 'ESTADO'
    sector VARCHAR(20) NOT NULL,          -- 'PRIVADO', 'PUBLICO'
    flag_mype VARCHAR(20) DEFAULT 'NO_APLICA', -- 'MYPE', 'NO_MYPE', 'NO_APLICA'
    fuente_origen VARCHAR(50) NOT NULL    -- 'CASTILLONV2', 'BD_CASTILLON_VETERINARIA', 'SamarImportadora', 'siga_1646_cloud'
);

CREATE INDEX IF NOT EXISTS idx_dim_empresa_estrato ON dim_empresa(estrato_tamanio);
CREATE INDEX IF NOT EXISTS idx_dim_empresa_mype ON dim_empresa(flag_mype);

-- 5. Dimension Ubicacion Geografica
CREATE TABLE IF NOT EXISTS dim_ubicacion (
    id_ubicacion SERIAL PRIMARY KEY,
    departamento VARCHAR(100),
    provincia VARCHAR(100),
    distrito_comuna VARCHAR(100),
    pais VARCHAR(50) DEFAULT 'PERU'
);

-- 6. Dimension Categoria y Tipo de Item (Bienes / Servicios)
CREATE TABLE IF NOT EXISTS dim_categoria_item (
    id_categoria SERIAL PRIMARY KEY,
    codigo_item VARCHAR(100),
    nombre_item VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    tipo_rubro VARCHAR(50), -- 'PRODUCTO', 'SERVICIO', 'BIEN', 'SUMINISTRO'
    unidad_medida VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_dim_categoria_rubro ON dim_categoria_item(tipo_rubro);

-- 7. Dimension Metodo de Pago / Modalidad Transaccion
CREATE TABLE IF NOT EXISTS dim_tipo_pago (
    id_tipo_pago SERIAL PRIMARY KEY,
    metodo_pago VARCHAR(50) NOT NULL, -- 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO', 'ORDEN_COMPRA', 'OTRO'
    tipo_transaccion VARCHAR(50)      -- 'CONTADO', 'CREDITO', 'GUBERNAMENTAL'
);

-- 8. Hecho 1: Ventas y Operaciones Privadas (Micro vs Mediana vs Grande)
CREATE TABLE IF NOT EXISTS fact_ventas_privadas (
    id_hecho BIGSERIAL PRIMARY KEY,
    id_tiempo INT NOT NULL REFERENCES dim_tiempo(id_tiempo),
    id_empresa INT NOT NULL REFERENCES dim_empresa(id_empresa),
    id_ubicacion INT REFERENCES dim_ubicacion(id_ubicacion),
    id_categoria INT REFERENCES dim_categoria_item(id_categoria),
    id_tipo_pago INT REFERENCES dim_tipo_pago(id_tipo_pago),
    nro_comprobante VARCHAR(100),
    tipo_comprobante VARCHAR(50), -- 'BOLETA', 'FACTURA', 'TICKET', 'PEDIDO'
    cantidad NUMERIC(12,2) DEFAULT 1,
    monto_subtotal NUMERIC(14,2) NOT NULL,
    monto_impuesto NUMERIC(14,2) DEFAULT 0,
    monto_total NUMERIC(14,2) NOT NULL,
    descuento NUMERIC(14,2) DEFAULT 0,
    ticket_promedio NUMERIC(14,2)
);

CREATE INDEX IF NOT EXISTS idx_fact_ventas_tiempo ON fact_ventas_privadas(id_tiempo);
CREATE INDEX IF NOT EXISTS idx_fact_ventas_empresa ON fact_ventas_privadas(id_empresa);

-- 9. Hecho 2: Compras y Contrataciones Estatales (SIGA - Adjudicaciones MYPE vs Grandes)
CREATE TABLE IF NOT EXISTS fact_compras_estatales (
    id_hecho BIGSERIAL PRIMARY KEY,
    id_tiempo INT NOT NULL REFERENCES dim_tiempo(id_tiempo),
    id_proveedor INT NOT NULL REFERENCES dim_empresa(id_empresa),
    id_ubicacion INT REFERENCES dim_ubicacion(id_ubicacion),
    id_categoria INT REFERENCES dim_categoria_item(id_categoria),
    nro_orden VARCHAR(50) NOT NULL,
    ano_eje INT NOT NULL,
    tipo_bien VARCHAR(10), -- 'B' (Bien) o 'S' (Servicio)
    monto_adjudicado NUMERIC(14,2) NOT NULL,
    cantidad_items NUMERIC(12,2) DEFAULT 1,
    precio_unitario NUMERIC(14,2) DEFAULT 0,
    flag_proveedor_mype VARCHAR(20) NOT NULL, -- 'MYPE', 'NO_MYPE'
    estado_orden VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_fact_compras_tiempo ON fact_compras_estatales(id_tiempo);
CREATE INDEX IF NOT EXISTS idx_fact_compras_proveedor ON fact_compras_estatales(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_fact_compras_mype ON fact_compras_estatales(flag_proveedor_mype);
