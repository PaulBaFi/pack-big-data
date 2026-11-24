export const date = (s: string | null | undefined) => {
  if (!s) return "—";
  try {
    const str = String(s).trim();
    const d =
      str.includes("T") || str.includes("Z")
        ? new Date(str)
        : new Date(`${str}T12:00:00`);

    if (isNaN(d.getTime())) return str;

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(s);
  }
};

export const currentDate = new Date().toLocaleDateString("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
