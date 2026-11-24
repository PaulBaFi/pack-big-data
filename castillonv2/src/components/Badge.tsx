export const formatStatus = (s: string): { label: string; type: "good" | "warn" | "neutral" | "info" } => {
  const code = String(s ?? "").trim().toUpperCase();
  switch (code) {
    case "P":
      return { label: "Pendiente", type: "warn" };
    case "C":
      return { label: "Atendido", type: "info" };
    case "F":
      return { label: "Cobrado", type: "good" };
    case "1":
      return { label: "Atendido", type: "info" };
    case "0":
      return { label: "Cancelado", type: "neutral" };
    case "A":
      return { label: "Activo", type: "good" };
    case "I":
      return { label: "Inactivo", type: "neutral" };
    case "D":
      return { label: "Disponible", type: "good" };
    case "O":
      return { label: "Ocupada", type: "warn" };
    case "CONFIRMADA":
      return { label: "Confirmada", type: "good" };
    case "ANULADA":
      return { label: "Anulada", type: "neutral" };
    default:
      return { label: code || "—", type: "neutral" };
  }
};

const badge = (s: string) => {
  const { label, type } = formatStatus(s);
  return (
    <span className={`badge ${type}`}>
      {type === "warn" && <span style={{ marginRight: 4 }}>●</span>}
      {type === "good" && <span style={{ marginRight: 4 }}>✓</span>}
      {type === "info" && <span style={{ marginRight: 4 }}>●</span>}
      {label}
    </span>
  );
};

export default badge;
