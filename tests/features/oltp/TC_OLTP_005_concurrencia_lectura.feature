# language: es
@oltp @concurrencia
Feature: Concurrencia en acceso a tabla VENTAS de CastillonV2
  HU-OLTP-05: Como administrador de base de datos,
  quiero que las operaciones concurrentes de lectura y escritura no generen datos corruptos,
  para asegurar la integridad bajo carga simultanea.

  Scenario: Dos sesiones concurrentes leen el mismo contador sin inconsistencia
    Given dos conexiones independientes activas a CastillonV2
    When ambas sesiones consultan el total de registros de VENTAS simultaneamente
    Then ambas sesiones obtienen el mismo conteo de registros
