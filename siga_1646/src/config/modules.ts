export type Module = {
  path: string;
  label: string;
  group: string;
  table: string;
  description: string;
  canCreate?: boolean;
};

export const modules: Module[] = [
  {
    path: "catalogos",
    label: "Catálogos",
    group: "Catálogos",
    table: "CATALOGO_BIEN_SERV",
    description: "Bienes, servicios, familias, grupos y unidades de medida",
    canCreate: true,
  },
  {
    path: "institucion",
    label: "Institución",
    group: "Catálogos",
    table: "SIG_CENTRO_COSTO",
    description: "Centros de costo, sedes y unidades ejecutoras",
    canCreate: true,
  },
  {
    path: "necesidades",
    label: "Cuadros de necesidades",
    group: "Planificación",
    table: "SIG_CUADRO_NECESIDAD",
    description: "Registro cabecera-detalle de necesidades",
    canCreate: true,
  },
  {
    path: "programacion",
    label: "Programación PAAC",
    group: "Planificación",
    table: "SIG_PAAC_CONSOLIDADO",
    description:
      "Programación y consolidación de adquisiciones · aprobación simulada",
  },
  {
    path: "pedidos",
    label: "Pedidos internos",
    group: "Abastecimiento",
    table: "SIG_PEDIDOS",
    description: "Pedidos y sus detalles",
    canCreate: true,
  },
  {
    path: "cotizaciones",
    label: "Cotizaciones",
    group: "Abastecimiento",
    table: "SIG_SOLICITUD_COTIZACION",
    description: "Solicitudes e ítems de cotización",
    canCreate: true,
  },
  {
    path: "ordenes",
    label: "Órdenes de adquisición",
    group: "Abastecimiento",
    table: "SIG_ORDEN_ADQUISICION",
    description: "Consulta de órdenes e ítems",
  },
  {
    path: "contratistas",
    label: "Contratistas",
    group: "Contrataciones",
    table: "SIG_CONTRATISTAS",
    description: "Padrón de contratistas y contratación",
    canCreate: true,
  },
  {
    path: "contratos",
    label: "Contratos",
    group: "Contrataciones",
    table: "SIG_CONTRATOS",
    description: "Contratos, ítems y detalles",
  },
  {
    path: "presupuesto",
    label: "Certificaciones",
    group: "Presupuesto",
    table: "SIG_CERTIFICACION",
    description: "Certificaciones y movimientos presupuestales",
  },
  {
    path: "devengados",
    label: "Devengados",
    group: "Presupuesto",
    table: "SIG_DEVENGADO",
    description: "Devengados, documentos e ítems",
  },
  {
    path: "almacenes",
    label: "Almacenes y movimientos",
    group: "Almacén",
    table: "SIG_ALMACEN",
    description: "Almacenes e ingresos/salidas",
    canCreate: true,
  },
  {
    path: "kardex",
    label: "Kardex",
    group: "Almacén",
    table: "SIG_KARDEX_POR_ALMACEN",
    description: "Kardex por almacén e inventario",
  },
  {
    path: "inventarios",
    label: "Inventarios físicos",
    group: "Almacén",
    table: "SIG_INVENTARIO_FISICO",
    description: "Inventarios y detalles",
    canCreate: true,
  },
  {
    path: "patrimonio",
    label: "Patrimonio",
    group: "Patrimonio",
    table: "SIG_PATRIMONIO",
    description: "Bienes patrimoniales y movimientos",
  },
  {
    path: "asignaciones",
    label: "Asignaciones",
    group: "Patrimonio",
    table: "SIG_ASIGNACIONES",
    description: "Asignación y devolución de bienes",
    canCreate: true,
  },
  {
    path: "seguridad",
    label: "Seguridad",
    group: "Seguridad",
    table: "SEG_USUARIO",
    description: "Usuarios, roles y privilegios · sin contraseñas reales",
    canCreate: true,
  },
  {
    path: "seguimiento",
    label: "Seguimiento y auditoría",
    group: "Seguridad",
    table: "SIG_SEGUIMIENTO",
    description: "Trazabilidad y auditoría simulada",
  },
  {
    path: "reportes",
    label: "Reportes",
    group: "Reportes",
    table: "SIG_CERTIFICACION",
    description: "Indicadores derivados de mocks administrativos",
  },
];

export const navigationGroups = [
  "Catálogos",
  "Planificación",
  "Abastecimiento",
  "Contrataciones",
  "Presupuesto",
  "Almacén",
  "Patrimonio",
  "Seguridad",
  "Reportes",
];
