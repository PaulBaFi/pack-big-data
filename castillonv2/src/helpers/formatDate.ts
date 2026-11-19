export const date = (s: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(s + "T12:00:00"));

export const currentDate = new Date().toLocaleDateString("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
