# language: es
@oltp @eliminacion
Feature: Eliminacion de registros con integridad referencial en CastillonV2
  HU-OLTP-03: Como administrador,
  quiero que el sistema impida eliminar categorias referenciadas por productos,
  para preservar la integridad referencial de la base de datos.

  Scenario: Intentar eliminar una categoria referenciada genera error de integridad
    Given una conexion activa a la base de datos CastillonV2
    And existe al menos una categoria asociada a un producto
    When intento eliminar una categoria que tiene productos asociados
    Then el motor de base de datos rechaza la operacion con error de integridad referencial
