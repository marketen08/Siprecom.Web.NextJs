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

/** Nivel individual de un rol puntual (no compuesto). 0 si no existe. */
export function roleLevelOne(role: string | null | undefined): number {
  if (!role) return 0
  return ROLE_LEVEL[role] ?? 0
}

/**
 * El rol más alto del usuario — el único que vale mostrar.
 *
 * Hace falta porque el claim `roles` del JWT viene **expandido** (ver
 * `JwtHandler.ExpandRoles`): un SuperAdmin trae los ocho roles, así que listarlos todos
 * sería ruido. El rol asignado en la base es uno solo, pero nada impide dos, y ahí también
 * el que describe al usuario es el mayor.
 *
 * Devuelve null si no tiene ninguno conocido — un usuario sin rol existe (alta a medias) y
 * la UI tiene que poder decirlo en vez de inventar "User".
 */
export function rolPrincipal(roles: string[] | undefined | null): AppRole | null {
  if (!roles?.length) return null
  const mayor = roles.reduce<{ rol: string | null; nivel: number }>(
    (max, r) => (roleLevelOne(r) > max.nivel ? { rol: r, nivel: roleLevelOne(r) } : max),
    { rol: null, nivel: 0 },
  )
  return (mayor.rol as AppRole) ?? null
}

/**
 * Cómo se nombra cada rol en pantalla. Los nombres técnicos se mantienen donde el usuario
 * ya los conoce (la lista de usuarios, el selector de rol); esto es para los lugares donde
 * se le habla al propio usuario de sí mismo, como el menú del perfil, y "AdminGlobal" ahí
 * no dice nada.
 */
export const ROL_ETIQUETA: Record<AppRole, string> = {
  SuperAdmin: "Super Admin",
  AdminGlobal: "Administrador global",
  Admin: "Administrador",
  Supervisor: "Supervisor",
  Coordinador: "Coordinador",
  User: "Usuario",
  Auditor: "Auditor",
  Consultor: "Consultor",
}

/** Etiqueta del rol más alto, lista para mostrar. Null si no tiene rol. */
export function etiquetaRolPrincipal(roles: string[] | undefined | null): string | null {
  const rol = rolPrincipal(roles)
  return rol ? ROL_ETIQUETA[rol] ?? rol : null
}

/**
 * True si `caller` puede asignar `nuevoRol` a otro usuario. Regla: sólo roles
 * ESTRICTAMENTE inferiores al del caller. Un Admin no puede promover a
 * AdminGlobal ni SuperAdmin; un AdminGlobal no puede tocar SuperAdmin.
 * Espeja la validación server-side en `AuthController.SetUserRol`.
 */
export function puedeAsignarRol(
  callerRoles: string[] | undefined | null,
  nuevoRol: AppRole | string,
): boolean {
  const nivelCaller = roleLevel(callerRoles)
  const nivelNuevo = roleLevelOne(nuevoRol)
  return nivelCaller > 0 && nivelNuevo > 0 && nivelNuevo < nivelCaller
}

/**
 * True si `caller` puede editar los roles de un usuario destino con
 * `targetRoles`. Regla: no se puede tocar a un peer ni a un superior.
 * Espeja la validación server-side en `AuthController.SetUserRol`.
 */
export function puedeEditarRolesDe(
  callerRoles: string[] | undefined | null,
  targetRoles: string[] | undefined | null,
): boolean {
  const nivelCaller = roleLevel(callerRoles)
  const nivelTarget = roleLevel(targetRoles)
  return nivelCaller > 0 && nivelTarget < nivelCaller
}
