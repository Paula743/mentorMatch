export function apiError(e: any): string {
  const err = e?.data?.error;
  const details: string[] = Array.isArray(err?.details)
    ? err.details.map((d: any) => (typeof d === "string" ? d : d?.message)).filter(Boolean)
    : [];
  if (err?.message && details.length) return `${err.message}: ${details.join(". ")}`;
  return err?.message ?? e?.message ?? "Ocurrió un error";
}
