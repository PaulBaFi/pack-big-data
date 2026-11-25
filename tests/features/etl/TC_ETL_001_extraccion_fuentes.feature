# language: es
@etl @extraccion
Feature: Extraccion de datos desde fuentes OLTP hacia el ETL
  HU-ETL-01: Como ingeniero de datos,
  quiero verificar que el ETL extrae registros reales de las cuatro fuentes OLTP,
  para garantizar que el pipeline no trabaja con datos vacios.

  Scenario: La extraccion de ventas de CastillonV2 retorna registros
    Given el pipeline ETL tiene acceso a las cuatro fuentes OLTP
    When se consultan las ventas de la fuente CastillonV2
    Then el numero de registros extraidos es mayor a cero
