# language: es
@oltp @transaccion
Feature: Atomicidad transaccional en la base OLTP Veterinaria
  HU-OLTP-04: Como desarrollador del sistema,
  quiero que una transaccion con error revierta todos sus cambios,
  para garantizar la consistencia de los datos ante fallos parciales.

  Scenario: Una transaccion fallida revierte todos los cambios realizados
    Given una conexion activa a la base de datos Veterinaria con transaccion abierta
    When ejecuto dos operaciones dentro de la transaccion y la primera tiene exito pero la segunda falla
    Then ninguna de las dos operaciones queda persistida en la base de datos
