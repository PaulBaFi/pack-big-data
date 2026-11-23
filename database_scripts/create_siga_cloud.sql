-- ==============================================================================
-- Script de Creacion y Optimizacion: siga_1646_cloud
-- Objetivo: Extraer las 46 tablas que requiere el sistema web Astro de SIGA
--           reduciendo el tamano de 27.8 GB a < 250 MB.
-- Aislamiento: La base original [siga_1646] NO se modifica en lo absoluto.
-- ==============================================================================

SET NOCOUNT ON;
PRINT 'Iniciando proceso de creacion y optimizacion de siga_1646_cloud...';

USE master;
GO

-- 1. Crear la base de datos limpia siga_1646_cloud
IF DB_ID('siga_1646_cloud') IS NOT NULL
BEGIN
    PRINT 'Eliminando base de datos previa siga_1646_cloud...';
    ALTER DATABASE [siga_1646_cloud] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [siga_1646_cloud];
END
GO

PRINT 'Creando nueva base de datos [siga_1646_cloud]...';
CREATE DATABASE [siga_1646_cloud];
GO

ALTER DATABASE [siga_1646_cloud] SET RECOVERY SIMPLE;
GO

PRINT 'Copiando tablas maestras y catalogos (100% de datos)...';

-- GRUPO 1: CATALOGOS Y MAESTROS
SELECT * INTO [siga_1646_cloud].[dbo].[CATALOGO_BIEN_SERV] FROM [siga_1646].[dbo].[CATALOGO_BIEN_SERV];
SELECT * INTO [siga_1646_cloud].[dbo].[FAMILIA_BIEN_SERV] FROM [siga_1646].[dbo].[FAMILIA_BIEN_SERV];
SELECT * INTO [siga_1646_cloud].[dbo].[GRUPO_BIEN_SERV] FROM [siga_1646].[dbo].[GRUPO_BIEN_SERV];
SELECT * INTO [siga_1646_cloud].[dbo].[UNIDAD_MEDIDA] FROM [siga_1646].[dbo].[UNIDAD_MEDIDA];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CENTRO_COSTO] FROM [siga_1646].[dbo].[SIG_CENTRO_COSTO];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_SEDES] FROM [siga_1646].[dbo].[SIG_SEDES];
SELECT * INTO [siga_1646_cloud].[dbo].[EJECUTORA] FROM [siga_1646].[dbo].[EJECUTORA];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CLASIFICADOR_GASTO] FROM [siga_1646].[dbo].[SIG_CLASIFICADOR_GASTO];
SELECT * INTO [siga_1646_cloud].[dbo].[FUENTE_FINANC] FROM [siga_1646].[dbo].[FUENTE_FINANC];
SELECT * INTO [siga_1646_cloud].[dbo].[META] FROM [siga_1646].[dbo].[META];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_ALMACEN] FROM [siga_1646].[dbo].[SIG_ALMACEN];
SELECT * INTO [siga_1646_cloud].[dbo].[SEG_USUARIO] FROM [siga_1646].[dbo].[SEG_USUARIO];
SELECT * INTO [siga_1646_cloud].[dbo].[SEG_ROL_USUARIO] FROM [siga_1646].[dbo].[SEG_ROL_USUARIO];
SELECT * INTO [siga_1646_cloud].[dbo].[SEG_ROL_PAGINA_PRIVILEGIO] FROM [siga_1646].[dbo].[SEG_ROL_PAGINA_PRIVILEGIO];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CONTRATISTAS] FROM [siga_1646].[dbo].[SIG_CONTRATISTAS];

PRINT 'Copiando contrataciones y compras estatales (100% de datos historicos)...';

-- GRUPO 2: ORDENES, CONTRATOS, COTIZACIONES Y PRESUPUESTO
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_ORDEN_ADQUISICION] FROM [siga_1646].[dbo].[SIG_ORDEN_ADQUISICION];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_ORDEN_ITEM] FROM [siga_1646].[dbo].[SIG_ORDEN_ITEM];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CONTRATOS] FROM [siga_1646].[dbo].[SIG_CONTRATOS];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CONTRATO_ITEM] FROM [siga_1646].[dbo].[SIG_CONTRATO_ITEM];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CONTRATO_DET] FROM [siga_1646].[dbo].[SIG_CONTRATO_DET];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_SOLICITUD_COTIZACION] FROM [siga_1646].[dbo].[SIG_SOLICITUD_COTIZACION];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_SOLICITUD_COTIZACION_ITEM] FROM [siga_1646].[dbo].[SIG_SOLICITUD_COTIZACION_ITEM];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CERTIFICACION] FROM [siga_1646].[dbo].[SIG_CERTIFICACION];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CERTIFICACION_MOV] FROM [siga_1646].[dbo].[SIG_CERTIFICACION_MOV];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CERTIFICACION_PPTO] FROM [siga_1646].[dbo].[SIG_CERTIFICACION_PPTO];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_DEVENGADO] FROM [siga_1646].[dbo].[SIG_DEVENGADO];
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_DEVENGADO_ITEM] FROM [siga_1646].[dbo].[SIG_DEVENGADO_ITEM];

PRINT 'Copiando planificacion, pedidos y almacenes (periodos 2023-2026)...';

-- GRUPO 3: PLANIFICACION, ALMACEN, PATRIMONIO (Filtrado reciente ANO_EJE >= 2023)
SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CUADRO_NECESIDAD] 
FROM [siga_1646].[dbo].[SIG_CUADRO_NECESIDAD] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_CUADRO_NECESIDAD_DET] 
FROM [siga_1646].[dbo].[SIG_CUADRO_NECESIDAD_DET] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_PAAC_CONSOLIDADO] 
FROM [siga_1646].[dbo].[SIG_PAAC_CONSOLIDADO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_PAAC_ITEM] 
FROM [siga_1646].[dbo].[SIG_PAAC_ITEM] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_PAAC_DET] 
FROM [siga_1646].[dbo].[SIG_PAAC_DET] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_PEDIDOS] 
FROM [siga_1646].[dbo].[SIG_PEDIDOS] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_DETALLE_PEDIDOS] 
FROM [siga_1646].[dbo].[SIG_DETALLE_PEDIDOS] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_MOVIM_ALMACEN] 
FROM [siga_1646].[dbo].[SIG_MOVIM_ALMACEN] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_DETALLE_MOVIM_ALMACEN] 
FROM [siga_1646].[dbo].[SIG_DETALLE_MOVIM_ALMACEN] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_KARDEX_POR_ALMACEN] 
FROM [siga_1646].[dbo].[SIG_KARDEX_POR_ALMACEN] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_KARDEX_INVENTARIO] 
FROM [siga_1646].[dbo].[SIG_KARDEX_INVENTARIO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_INVENTARIO_FISICO] 
FROM [siga_1646].[dbo].[SIG_INVENTARIO_FISICO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_DETALLE_INVENT_FISICO] 
FROM [siga_1646].[dbo].[SIG_DETALLE_INVENT_FISICO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_PATRIMONIO] 
FROM [siga_1646].[dbo].[SIG_PATRIMONIO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_MOVIM_PATRIMONIO] 
FROM [siga_1646].[dbo].[SIG_MOVIM_PATRIMONIO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_ASIGNACIONES] 
FROM [siga_1646].[dbo].[SIG_ASIGNACIONES] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_MOVIM_ASIGNACION] 
FROM [siga_1646].[dbo].[SIG_MOVIM_ASIGNACION] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_SEGUIMIENTO] 
FROM [siga_1646].[dbo].[SIG_SEGUIMIENTO] 
WHERE ANO_EJE >= 2023;

SELECT * INTO [siga_1646_cloud].[dbo].[SIG_AUDITORIA] 
FROM [siga_1646].[dbo].[SIG_AUDITORIA] 
WHERE ANO_EJE >= 2023;

PRINT 'Compactando base de datos y limpiando log...';
USE [siga_1646_cloud];
GO
DBCC SHRINKDATABASE ([siga_1646_cloud], 10);
GO

PRINT 'Proceso finalizado con exito.';
