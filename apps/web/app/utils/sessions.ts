import type { Session } from "~/types/student";

export type SessionState = "UPCOMING" | "COMPLETED" | "CANCELLED";

//estado de la sesión
export function sessionState(s: Session): SessionState {
  if (s.status === "CANCELLED") return "CANCELLED";
  return new Date(s.ends_at) < new Date() ? "COMPLETED" : "UPCOMING";
}

//convierte la diferencia entre el inicio y el ahora en minutos
// si faltan 30 o mas minutos, se puede
export function canCancel(s: Session): boolean {
  if (sessionState(s) !== "UPCOMING") return false;
  const minutesLeft = (new Date(s.starts_at).getTime() - Date.now()) / 60000;
  return minutesLeft >= 30;
}

//solo permite calificar sesiones completas
export function canRate(s: Session): boolean {
  return sessionState(s) === "COMPLETED" && s.rating === null;
}