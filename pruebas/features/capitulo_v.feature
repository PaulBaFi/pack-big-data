# Cada escenario representa un caso de prueba único. Los pasos reutilizan el
# vocabulario Dado/Cuando/Entonces del ejecutor controlado.
Característica: Validación de la solución analítica empresarial

  @OLTP-001
  Escenario: Insertar una venta válida
    Dado un esquema OLTP aislado
    Cuando se inserta una venta válida
    Entonces la venta queda persistida

  @OLTP-002
  Escenario: Actualizar una venta existente
    Dado una venta persistida
    Cuando se actualiza su importe
    Entonces el nuevo importe queda persistido

  @OLTP-003
  Escenario: Eliminar una venta existente
    Dado una venta persistida
    Cuando se elimina la venta
    Entonces la venta deja de existir

  @OLTP-004
  Escenario: Revertir una transacción
    Dado una transacción OLTP abierta
    Cuando se inserta una venta y se ejecuta rollback
    Entonces la venta no queda persistida

  @OLTP-005
  Escenario: Rechazar una referencia inexistente
    Dado una relación entre ventas y clientes
    Cuando se inserta una venta con cliente inexistente
    Entonces PostgreSQL rechaza la operación

  @OLTP-006
  Escenario: Serializar actualizaciones concurrentes
    Dado una venta con versión cero
    Cuando diez sesiones incrementan la versión concurrentemente
    Entonces la versión final es diez

  @ETL-001
  Escenario: Extraer ventas de la fuente
    Dado dos ventas controladas
    Cuando se ejecuta la extracción
    Entonces se obtienen dos registros

  @ETL-002
  Escenario: Limpiar texto extraído
    Dado un documento con espacios
    Cuando se limpia el registro
    Entonces el documento queda normalizado

  @ETL-003
  Escenario: Evitar duplicados en la carga
    Dado un lote ya cargado
    Cuando se carga nuevamente
    Entonces no se duplican los hechos

  @ETL-004
  Escenario: Resolver valores nulos
    Dado una venta con categoría y total nulos
    Cuando se transforma la venta
    Entonces se asignan valores derivados válidos

  @ETL-005
  Escenario: Transformar fecha a clave dimensional
    Dado una fecha de venta
    Cuando se transforma para el modelo estrella
    Entonces se obtiene una clave YYYYMMDD

  @ETL-006
  Escenario: Cargar dimensiones y hechos
    Dado un lote transformado
    Cuando se carga al Data Warehouse
    Entonces existen dimensiones y hechos asociados

  @DW-001
  Escenario: Verificar el número de hechos
    Dado el lote cargado
    Cuando se cuentan los hechos
    Entonces el conteo coincide con el origen

  @DW-002
  Escenario: Verificar integridad referencial dimensional
    Dado hechos cargados
    Cuando se buscan referencias huérfanas
    Entonces no se encuentra ninguna

  @DW-003
  Escenario: Verificar atributos de dimensiones
    Dado la dimensión tiempo
    Cuando se validan año y mes
    Entonces corresponden a la fecha de origen

  @DW-004
  Escenario: Verificar medidas de hechos
    Dado hechos cargados
    Cuando se buscan montos nulos o negativos
    Entonces no se encuentra ninguno

  @DW-005
  Escenario: Verificar consistencia del total almacenado
    Dado hechos cargados
    Cuando se suma el monto total
    Entonces se obtiene el total controlado

  @OLAP-001
  Escenario: Agregar ventas
    Dado hechos de ventas
    Cuando se aplica SUM al monto
    Entonces se obtiene el total esperado

  @OLAP-002
  Escenario: Filtrar por categoría
    Dado hechos categorizados
    Cuando se filtra la categoría RETAIL
    Entonces se obtiene únicamente su hecho

  @OLAP-003
  Escenario: Consultar por tiempo y categoría
    Dado dimensiones de tiempo y categoría
    Cuando se agrupan ambas dimensiones
    Entonces se obtienen las celdas multidimensionales esperadas

  @OLAP-004
  Escenario: Desglosar año a mes
    Dado ventas del año 2026
    Cuando se desglosan por mes
    Entonces noviembre contiene las ventas controladas

  @OLAP-005
  Escenario: Conciliar origen y cubo analítico
    Dado ventas transformadas
    Cuando se comparan conteos y montos
    Entonces origen y destino coinciden

  @PBI-001 @manual
  Escenario: Validar conexión de Power BI al Data Warehouse
    Dado acceso autorizado a Power BI
    Cuando se actualiza el modelo semántico
    Entonces la actualización concluye sin errores

  @PBI-002 @manual
  Escenario: Validar relaciones del modelo Power BI
    Dado el modelo semántico abierto
    Cuando se inspeccionan sus relaciones
    Entonces las dimensiones se relacionan uno a muchos con los hechos

  @PBI-003 @manual
  Escenario: Validar medidas DAX implementadas
    Dado el reporte Power BI abierto
    Cuando se evalúan sus medidas implementadas
    Entonces coinciden con consultas equivalentes del Data Warehouse

  @PBI-004 @manual
  Escenario: Validar filtros del reporte
    Dado una visualización con datos
    Cuando se aplica un filtro implementado
    Entonces todos los indicadores respetan el filtro

  @PBI-005 @manual
  Escenario: Validar indicadores y visualizaciones
    Dado el reporte actualizado
    Cuando se revisan indicadores y visualizaciones implementados
    Entonces muestran valores consistentes y sin errores

  @E2E-001 @integral
  Escenario: Conciliar una venta desde OLTP hasta Power BI
    Dado una venta controlada registrada en OLTP
    Cuando se ejecuta ETL y se consulta OLAP y Power BI
    Entonces el importe coincide desde el origen hasta el indicador final
