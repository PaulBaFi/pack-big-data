export const money = (n: number | string | null | undefined) => {
  const val = typeof n === "number" ? n : parseFloat(String(n ?? 0));
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(isNaN(val) ? 0 : val);
  } catch {
    return `S/ ${(isNaN(val) ? 0 : val).toFixed(2)}`;
  }
};
