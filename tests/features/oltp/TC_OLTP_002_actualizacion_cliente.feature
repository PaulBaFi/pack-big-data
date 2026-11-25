# language: es
@oltp @actualizacion
Feature: Actualizacion de datos de cliente en SamarImportadora
  HU-OLTP-02: Como operador de ventas,
  quiero actualizar el nombre de un cliente existente,
  para mantener la informacion de clientes actualizada.

  Scenario: Actualizar el nombre de un cliente existente en CLIENTES
    Given una conexion activa a la base de datos SamarImportadora
    And existe al menos un cliente registrado en la tabla CLIENTES
    When actualizo el campo NOMBRE del primer cliente al valor "CLIENTE_TEST_UPD"
    Then la consulta posterior retorna "CLIENTE_TEST_UPD" como NOMBRE del cliente modificado
