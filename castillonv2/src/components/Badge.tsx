const badge = (s: string) => (
  <span
    className={`badge ${s === "A" || s === "F" || s === "D" ? "good" : s === "P" ? "warn" : "neutral"}`}
  >
    {s}
  </span>
);

export default badge;
