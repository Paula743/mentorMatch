export function apiError(e: any): string {
  return e?.data?.error?.message ?? e?.message ?? "Ocurrió un error";
}