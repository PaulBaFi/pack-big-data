# language: es
@etl @limpieza @nulos
Feature: Limpieza de valores nulos en la extraccion ETL
  HU-ETL-02: Como ingeniero de datos,
  quiero que el ETL reemplace valores nulos por valores predeterminados validos,
  para evitar errores de carga en el Data Warehouse.

  Scenario: Los montos nulos en ventas de Veterinaria son tratados como cero
    Given el pipeline ETL extrae registros de la tabla VENTA de Veterinaria
    When se aplica la transformacion de nulos sobre SUBTOTAL, IGV y MONTOTOTAL
    Then ninguno de los registros transformados contiene valores nulos en los campos de monto
