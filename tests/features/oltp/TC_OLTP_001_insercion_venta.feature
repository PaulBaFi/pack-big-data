# language: es
@oltp @insercion
Feature: Registro de ventas en la base OLTP CastillonV2
  HU-OLTP-01: Como administrador del sistema de restaurante,
  quiero registrar una venta nueva,
  para que el sistema refleje las operaciones comerciales del dia.

  Scenario: Insertar una venta valida en la tabla VENTAS de CastillonV2
    Given una conexion activa a la base de datos CastillonV2
    And existe un registro valido de empresa y empleado en la base
    When inserto una venta con fecha "2026-11-24", subtotal 100.00, IGV 18.00 y total 118.00
    Then el registro de venta existe en la tabla VENTAS
    And el monto total almacenado es igual a 118.00
