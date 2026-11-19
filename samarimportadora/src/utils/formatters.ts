export const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value || 0);
  
export const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
