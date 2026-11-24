-- Ejecutar una vez sobre la base transaccional Samar, con privilegios de CREATE.
-- No altera ni elimina registros históricos. Las secuencias se adelantan al máximo existente.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS samar_cliente_seq;
CREATE SEQUENCE IF NOT EXISTS samar_articulo_seq;
CREATE SEQUENCE IF NOT EXISTS samar_vendedor_seq;
CREATE SEQUENCE IF NOT EXISTS samar_region_seq;
CREATE SEQUENCE IF NOT EXISTS samar_provincia_seq;
CREATE SEQUENCE IF NOT EXISTS samar_comuna_seq;
CREATE SEQUENCE IF NOT EXISTS samar_sucursal_seq;
CREATE SEQUENCE IF NOT EXISTS samar_cliente_buey_seq;
CREATE SEQUENCE IF NOT EXISTS samar_prospecto_seq;
CREATE SEQUENCE IF NOT EXISTS samar_documento_venta_seq;

SELECT setval('samar_cliente_seq', GREATEST(COALESCE((SELECT max(substring("ID_CLIENTE" from '(\d+)$')::bigint) FROM "CLIENTES" WHERE "ID_CLIENTE" ~ '\d+$'), 0), 1), true);
SELECT setval('samar_articulo_seq', GREATEST(COALESCE((SELECT max(substring("CODIGO_PRODUCTO" from '(\d+)$')::bigint) FROM "ARTICULOS" WHERE "CODIGO_PRODUCTO" ~ '\d+$'), 0), 1), true);
SELECT setval('samar_vendedor_seq', GREATEST(COALESCE((SELECT max("ID_VENDEDOR") FROM "VENDEDORES"), 0), 1), true);
SELECT setval('samar_region_seq', GREATEST(COALESCE((SELECT max("REGION_ID") FROM "REGION"), 0), 1), true);
SELECT setval('samar_provincia_seq', GREATEST(COALESCE((SELECT max("PROVINCIA_ID") FROM "PROVINCIA"), 0), 1), true);
SELECT setval('samar_comuna_seq', GREATEST(COALESCE((SELECT max("COMUNA_ID") FROM "COMUNA"), 0), 1), true);
SELECT setval('samar_sucursal_seq', GREATEST(COALESCE((SELECT max("SUCURSAL_ID") FROM "SUCURSAL"), 0), 1), true);
SELECT setval('samar_cliente_buey_seq', GREATEST(COALESCE((SELECT max(substring("ID_CLIENTE" from '(\d+)$')::bigint) FROM "ClientesBuey" WHERE "ID_CLIENTE" ~ '\d+$'), 0), 1), true);
SELECT setval('samar_prospecto_seq', GREATEST(COALESCE((SELECT max("NRO_CLIENTE") FROM "ProspectosClientesBuey"), 0), 1), true);
SELECT setval('samar_documento_venta_seq', GREATEST(COALESCE((SELECT max(substring("DOCUMENTO" from '(\d+)$')::bigint) FROM "VENTAS" WHERE "DOCUMENTO" ~ '\d+$'), 0), 1), true);
COMMIT;
