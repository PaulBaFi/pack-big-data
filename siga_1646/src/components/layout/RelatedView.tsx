import { useEffect, useState } from "react";
import DataTable from "../data/DataTable";
import { relatedTables } from "@/utils/relatedTables";
import { list } from "@/data/repositories/mockRepository";

import type { Module } from "@/config/modules";
import type { MockRow } from "@/data/mock/generators";

function RelatedView({
  row,
  module,
}: {
  row: MockRow | null;
  module?: Module;
}) {
  const [detailRows, setDetailRows] = useState<MockRow[]>([]);
  const detailTable = module ? relatedTables[module.table] : undefined;
  useEffect(() => {
    if (detailTable) list(detailTable).then(setDetailRows);
  }, [detailTable]);
  if (!detailTable)
    return (
      <div className="empty">
        <strong>Este módulo no tiene una tabla detalle configurada.</strong>
        <span>
          La relación queda desacoplada cuando el anexo no verifica una FK.
        </span>
      </div>
    );
  return (
    <div>
      <div className="detail-context">
        {row
          ? `Registro seleccionado: ${Object.values(row).slice(0, 3).join(" · ")}`
          : "Selecciona una fila del listado principal para consultar sus detalles."}
      </div>
      <DataTable rows={row ? detailRows.slice(0, 8) : []} table={detailTable} />
    </div>
  );
}

export default RelatedView;
