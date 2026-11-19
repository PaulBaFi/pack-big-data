import { Boxes } from "lucide-react";
import type { MockRow } from "@/data/mock/generators";

export default function DataTable({
  rows,
  table,
  onSelect,
}: {
  rows: MockRow[];
  table: string;
  onSelect?: (row: MockRow) => void;
}) {
  if (!rows.length)
    return (
      <div className="empty">
        <Boxes size={32} />
        <strong>Sin resultados</strong>
        <span>Ajusta la búsqueda o registra un nuevo elemento.</span>
      </div>
    );
  const cols = Object.keys(rows[0]);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${table}-${index}`}
              onClick={() => onSelect?.(row)}
              tabIndex={onSelect ? 0 : undefined}
            >
              {cols.map((column) => (
                <td key={column}>
                  {column === "ESTADO" || column.startsWith("FLAG") ? (
                    <span
                      className={`badge ${row[column] === "A" ? "success" : "neutral"}`}
                    >
                      {row[column]}
                    </span>
                  ) : (
                    String(row[column] ?? "—")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
