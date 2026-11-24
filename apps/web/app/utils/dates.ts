// Las fechas siempre se muestran en hora de México, sin importar la zona del navegador.
const TZ = "America/Mexico_City";

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "long",
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtRange(startsAt: string, endsAt: string): string {
  return `${fmtDate(startsAt)}, ${fmtTime(startsAt)} – ${fmtTime(endsAt)}`;
}

export function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
