-- ==============================================================================
-- Tablas de Seguridad, Control de Accesos y Auditoria de Administradores
-- Base de Datos: DW_Empresas_OLAP (Aiven PostgreSQL)
-- ==============================================================================

-- 1. Tabla de Usuarios Administradores
CREATE TABLE IF NOT EXISTS admin_usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'SUPERADMIN', -- 'SUPERADMIN', 'AUDITOR_ETL'
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    intentos_fallidos INT DEFAULT 0,
    bloqueado_hasta TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_usuarios_email ON admin_usuarios(email);

-- 2. Tabla de Auditoria de Acciones del Portal
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    id_usuario INT REFERENCES admin_usuarios(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    accion VARCHAR(100) NOT NULL, -- 'LOGIN', 'LOGOUT', 'ETL_MANUAL_TRIGGER', 'ETL_CONFIG_CHANGE', 'AUDIT_RUN', 'SYNC_CHECK'
    detalles JSONB,
    ip_address VARCHAR(50),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_email ON admin_audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_accion ON admin_audit_logs(accion);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_fecha ON admin_audit_logs(creado_en DESC);
