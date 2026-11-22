const HOME: Record<string, string> = {
  ADMIN: "/admin",
  STUDENT: "/alumno",
  ADVISOR: "/profesor",
};

export const homeFor = (role?: string | null) => HOME[role ?? ""] ?? "/login";