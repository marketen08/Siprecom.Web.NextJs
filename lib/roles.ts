// Jerarquía de roles globales, alineada con el backend (JwtHandler.ExpandRoles):
// SuperAdmin > Admin > Supervisor > User. Un rol superior habilita todo lo del
// inferior. El chequeo es por NIVEL (no por includes), así funciona aunque el
// token no venga expandido (ej. sesiones viejas con solo ["Admin"]).

export type AppRole = "User" | "Supervisor" | "Admin" | "SuperAdmin"

const ROLE_LEVEL: Record<string, number> = {
  User: 1,
  Supervisor: 2,
  Admin: 3,
  SuperAdmin: 4,
}

/** Nivel efectivo del usuario = el más alto de sus roles. 0 si no tiene ninguno. */
export function roleLevel(roles: string[] | undefined | null): number {
  if (!roles?.length) return 0
  return roles.reduce((max, r) => Math.max(max, ROLE_LEVEL[r] ?? 0), 0)
}

/** True si el usuario alcanza (o supera) el rol mínimo requerido. */
export function meetsRole(roles: string[] | undefined | null, min: AppRole): boolean {
  return roleLevel(roles) >= ROLE_LEVEL[min]
}
