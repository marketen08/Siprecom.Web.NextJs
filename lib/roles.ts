// Jerarquía de roles globales, alineada con el backend (JwtHandler.ExpandRoles):
//   SuperAdmin > AdminGlobal > Admin > Supervisor > Coordinador > User > Auditor > Consultor
// Un rol superior habilita todo lo del inferior. El chequeo es por NIVEL (no
// por includes), así funciona aunque el token no venga expandido (ej. sesiones
// viejas con solo ["Admin"]).
//
// Consultor: solo lectura + descarga (dashboard, planillas, registros, pendientes,
// certificados, 3D, estadísticas). No puede escribir nada.
// Auditor: mismo scope que Consultor + Control de cambios (auditoría).
// User: escritura operativa (crear pendientes, cargar registros, firmar, etc.).
// Coordinador: escalón entre User y Supervisor — gestiona la coordinación de tareas
//   (asignación masiva, cambios de fecha, cancelaciones, generación de faltantes).
//   Hereda de User (lo operativo) sin el scope amplio de Supervisor.
// Admin: gestiona proyectos donde tiene RecursoProyecto asignado.
// AdminGlobal: Admin con bypass del scope de proyectos — ve TODOS los proyectos y
//   puede gestionar usuarios de cualquier proyecto. NO abre el panel del proveedor.
// SuperAdmin: cuenta del proveedor — bypass + acceso al panel Super Admin.

export type AppRole =
  | "Consultor"
  | "Auditor"
  | "User"
  | "Coordinador"
  | "Supervisor"
  | "Admin"
  | "AdminGlobal"
  | "SuperAdmin"

const ROLE_LEVEL: Record<string, number> = {
  Consultor: 1,
  Auditor: 2,
  User: 3,
  Coordinador: 4,
  Supervisor: 5,
  Admin: 6,
  AdminGlobal: 7,
  SuperAdmin: 8,
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

/**
 * True si el usuario tiene rol de escritura (User o superior). Consultor y
 * Auditor son solo lectura — usar este helper para condicionar botones de
 * acción, forms y mutaciones en la UI.
 */
export function canWrite(roles: string[] | undefined | null): boolean {
  return meetsRole(roles, "User")
}

/** Inverso semántico de canWrite — más legible en algunos casos. */
export function isReadOnly(roles: string[] | undefined | null): boolean {
  return !canWrite(roles)
}
