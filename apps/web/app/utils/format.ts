const TZ = "America/Mexico_City";

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ,
  });
}

export function formatSlot(iso: string) {
  const day = new Date(iso).toLocaleDateString("es-MX", { weekday: "short", timeZone: TZ });
  return `${day} ${formatTime(iso)}`;
}

export function formatRange(startIso: string, endIso: string) {
  const d = new Date(startIso).toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short", timeZone: TZ,
  });
  return `${d}, ${formatTime(startIso)} – ${formatTime(endIso)}`;
}

export function dateParts(iso: string) {
  const d = new Date(iso);
  const sameDay =
    d.toLocaleDateString("es-MX", { timeZone: TZ }) ===
    new Date().toLocaleDateString("es-MX", { timeZone: TZ });
  return {
    weekday: sameDay
      ? "HOY"
      : d.toLocaleDateString("es-MX", { weekday: "short", timeZone: TZ }).replace(".", "").toUpperCase(),
    day: d.toLocaleDateString("es-MX", { day: "numeric", timeZone: TZ }),
    time: formatTime(iso),
  };
}