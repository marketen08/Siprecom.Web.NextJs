import type { AppRole } from "@/lib/roles"

export type MenuItem = {
  label: string
  href?: string
  children?: MenuItem[]
  /**
   * Rol mínimo para ver/entrar a este item (y sus hijos, salvo que el hijo
   * defina uno propio). Si se omite, hereda del ancestro; default "User".
   * Usa la escala lineal del `meetsRole`.
   */
  minRole?: AppRole
  /**
   * Lista blanca EXCLUSIVA de roles permitidos. Si está presente, sobreescribe
   * el `minRole` — el user pasa solo si tiene AL MENOS UNO de estos roles.
   * Usado para casos donde la jerarquía lineal no encaja (ej. Control de cambios:
   * Auditor sí, User NO — ambos tienen que estar tratados como paralelos).
   */
  allowedRoles?: AppRole[]
  /**
   * Si es true, el item se oculta cuando el proyecto activo es solo de
   * pre-firmados físicos (sin registro/firma digital) → no hay firmas
   * electrónicas que gestionar. Lo evalúa el Sidebar.
   */
  requiereFirmas?: boolean
  /**
   * Clave de funcionalidad (catálogo de feature flags) requerida para ver el
   * item. Se oculta si la función no está efectivamente habilitada en el
   * proyecto activo. Lo evalúa el Sidebar. Ej: "MAQUETA_3D".
   */
  requiereFuncionalidad?: string
  /**
   * Badge dinámico a mostrar al lado del label. El Sidebar mapea cada key a un
   * componente que hace su propio fetch. Sirve para contadores de "hay pendiente"
   * sin acoplar el menu a los hooks de datos.
   * Keys soportadas: `"tareas-pendientes-mias"`.
   */
  badge?: SidebarBadgeKey
}

/** Keys de badges dinámicos soportadas por el Sidebar. Ampliar según se agreguen. */
export type SidebarBadgeKey =
  | "tareas-pendientes-mias"
  | "pendientes-abiertos-mios"

export const menu: MenuItem[] = [
  // Dashboard como top-level (sin grupo). Antes era único hijo de "Gestión
  // de proyecto" — se elimina ese grupo vacío.
  { label: "Dashboard", href: "/dashboard", minRole: "Consultor" },
  // Avances como top-level propio — se usa tan o más seguido que los items
  // de Ejecución y son otra actividad (consulta del estado del proyecto, vs
  // "hacer cosas" que vive en Ejecución).
  {
    label: "Avances",
    minRole: "Consultor",
    children: [
      { label: "Por sistemas",     href: "/ejecucion/sistemas" },
      { label: "Por subsistemas",  href: "/ejecucion/subsistemas" },
      { label: "Por elementos",    href: "/ejecucion/elementos" },
      { label: "Por áreas",        href: "/ejecucion/areas" },
      { label: "Por módulos",      href: "/ejecucion/modulos" },
    ],
  },
  {
    label: "Ejecución",
    minRole: "Consultor",
    children: [
      // Tareas primero — vista operativa por tarea (movida desde "Avances").
      { label: "Tareas",                  href: "/ejecucion/tareas", badge: "tareas-pendientes-mias" },
      // Módulos operativos — Pendientes es lo más usado día a día.
      { label: "Pendientes",              href: "/ejecucion/pendientes", badge: "pendientes-abiertos-mios" },
      { label: "Visor de PIDs",           href: "/ejecucion/pids" },
      { label: "Modelo 3D",               href: "/ejecucion/modelo-3d", requiereFuncionalidad: "MAQUETA_3D" },
      { label: "Mis firmas",              href: "/mis-firmas", requiereFirmas: true, minRole: "User" },
      { label: "Paquetes de prueba",      href: "/ejecucion/test-groups" },
      { label: "Preservación",            href: "/ejecucion/preservacion", requiereFuncionalidad: "PRESERVACION" },
      // Herramientas — carga masiva por QR / app de escritorio offline. Vivían
      // en un top-level "Herramientas"; ahora quedan como submenu de Ejecución
      // porque son herramientas de ejecución.
      {
        label: "Herramientas",
        minRole: "Supervisor",
        children: [
          { label: "Carga rápida por QR", href: "/ejecucion/carga-rapida-qr" },
          { label: "App de escritorio",   href: "/ejecucion/app-escritorio" },
        ],
      },
    ],
  },
  {
    label: "Análisis",
    minRole: "Consultor",
    children: [
      {
        label: "Reportes",
        children: [
          { label: "Avance del proyecto",   href: "/reporte/avance" },
          { label: "Listado índice",         href: "/reporte/listado-indice" },
          { label: "Tareas realizadas",      href: "/reporte/tareas" },
          { label: "Listado de pendientes",  href: "/reporte/pendientes" },
          { label: "Databook por subsistema", href: "/reporte/databook" },
          { label: "Certificados RFC/RFSU/AOC", href: "/reporte/certificados" },
        ],
      },
      {
        label: "Estadísticas",
        children: [
          { label: "Resumen",                      href: "/estadisticas" },
          { label: "Avance por subsistemas",       href: "/estadisticas/avance-subsistemas" },
          { label: "Avance por áreas",             href: "/estadisticas/avance-areas" },
          { label: "Avance por módulos",           href: "/estadisticas/avance-modulos" },
          { label: "Cuantitativo por subsistemas", href: "/estadisticas/cuantitativo-subsistemas" },
          { label: "Avance programado",            href: "/estadisticas/avance-programado" },
          { label: "Planificación (Gantt)",        href: "/estadisticas/planificacion-gantt" },
          { label: "Skyline (carga)",              href: "/estadisticas/skyline" },
          { label: "Estado de pendientes",         href: "/estadisticas/estado-pendientes" },
        ],
      },
    ],
  },
  // Planificación pasa a ser su propio top-level (antes vivía dentro de
  // "Análisis"). Es un dominio con 5 páginas propias, se merece la sección.
  {
    label: "Planificación",
    minRole: "Supervisor",
    children: [
      { label: "Estimador",     href: "/planificacion/estimador" },
      { label: "Generador",     href: "/planificacion/generador" },
      { label: "Manual",        href: "/planificacion/manual" },
      { label: "Versiones",     href: "/planificacion/versiones" },
      { label: "Configuración", href: "/planificacion/configuracion" },
    ],
  },
  // Coordinación — acciones sobre las ETs existentes (eliminar, cancelar,
  // asignar responsable) + generación de faltantes. Reemplaza el link legacy
  // /alcance/tareas/generacion (que ahora es redirect).
  // Acceso: Coordinador+ (User/Consultor/Auditor NO).
  {
    label: "Coordinación",
    minRole: "Coordinador",
    children: [
      { label: "Tareas", href: "/coordinacion/tareas" },
    ],
  },
  {
    label: "Alcance",
    minRole: "Supervisor",
    children: [
      // "Proyecto" (singular) apunta al detalle del proyecto activo del user.
      // `/alcance/proyecto` es un wrapper que resuelve el activo y redirige a
      // `/alcance/proyectos/{id}`.
      { label: "Proyecto",     href: "/alcance/proyecto" },
      // "Proyectos" (plural, ABM) vive bajo Configuración — ver sección más abajo.
      { label: "Sistemas",     href: "/alcance/sistemas" },
      { label: "Subsistemas",  href: "/alcance/subsistemas" },
      { label: "Elementos",    href: "/alcance/elementos" },
      { label: "Tareas",       href: "/alcance/tareas" },
      { label: "Áreas",        href: "/alcance/areas" },
      { label: "Módulos",      href: "/alcance/modulos" },
      { label: "PIDs",         href: "/alcance/pids" },
      { label: "Paquetes de prueba", href: "/alcance/test-groups" },
      {
        label: "Importar",
        children: [
          { label: "Datos de proyecto",   href: "/alcance/importacion" },
          { label: "Tareas",              href: "/alcance/importacion-tareas" },
          { label: "Planificación",       href: "/alcance/importacion-planificacion" },
          { label: "Valores precargados", href: "/alcance/valores-precargados-importacion" },
          { label: "Pendientes",          href: "/alcance/importacion-pendientes" },
        ],
      },
    ],
  },
  {
    // Configuración = catálogos del TENANT (afectan a todos los proyectos) +
    // ABM de Proyectos. La sección se abre a Admin+ porque "Proyectos" (el
    // ABM) vive acá y es Admin+; el resto de la config son catálogos
    // tenant-wide restringidos a AdminGlobal.
    //
    // Estructura: Proyectos queda suelto arriba, el resto va agrupado en 4
    // sub-grupos temáticos. Cada sub-grupo lleva `minRole: "AdminGlobal"`
    // explícito para que Admin no vea el header colapsable vacío (herencia
    // del section no alcanza — los items propios son los que restringen).
    label: "Configuración",
    minRole: "Admin",
    children: [
      // ABM de proyectos — Admin+ puede administrar los propios proyectos
      // del tenant. Único ítem que Admin ve suelto arriba de las categorías.
      { label: "Proyectos", href: "/configuracion/proyectos", minRole: "Admin" },
      // Grupos de planillas — Admin+ (operativo). El grupo agrupa planillas
      // del tenant y define scope por proyecto. Editar la planilla en sí
      // sigue siendo AdminGlobal (bajo "Planillas y campos").
      { label: "Grupos de planillas", href: "/configuracion/planillas-grupos", minRole: "Admin" },
      {
        label: "Catálogos",
        minRole: "AdminGlobal",
        children: [
          { label: "Especialidades",    href: "/configuracion/especialidades" },
          { label: "Tipos de elemento", href: "/configuracion/elementos-tipos" },
          { label: "Niveles",           href: "/configuracion/niveles" },
        ],
      },
      {
        label: "Pendientes",
        minRole: "AdminGlobal",
        children: [
          { label: "Categorías",          href: "/configuracion/pendientes-categorias" },
          { label: "Tipos",               href: "/configuracion/pendientes-tipos" },
          { label: "Acciones",            href: "/configuracion/pendientes-acciones" },
          { label: "Motivos",             href: "/configuracion/pendientes-motivos" },
          { label: "Catálogo maestro",    href: "/configuracion/pendientes-catalogo" },
          { label: "Importar / Exportar", href: "/configuracion/importacion-maestro-pendientes" },
        ],
      },
      {
        label: "Planillas y campos",
        minRole: "AdminGlobal",
        children: [
          { label: "Campos",         href: "/configuracion/campos" },
          { label: "Planillas",      href: "/configuracion/planillas" },
          { label: "Procedimientos", href: "/configuracion/procedimientos" },
        ],
      },
      {
        label: "Organización",
        minRole: "AdminGlobal",
        children: [
          { label: "Clientes",     href: "/configuracion/clientes" },
          { label: "Contratistas", href: "/configuracion/contratistas" },
        ],
      },
    ],
  },
  {
    // Gestión de usuarios — separada de la config de catálogos.
    // El grupo se abre para Auditor+ o Admin+ dependiendo del sub-item.
    // Ver comentarios en cada hijo.
    label: "Administración del sistema",
    minRole: "Auditor",
    children: [
      { label: "Usuarios",          href: "/configuracion/usuarios", minRole: "Admin" },
      { label: "Grupos de usuarios", href: "/configuracion/grupos-usuarios", minRole: "Admin" },
      // Control de cambios: Auditor y Supervisor+ (User NO — es rol de escritura
      // operativa, no de auditoría). Ambos son roles con capacidades distintas.
      {
        label: "Control de cambios",
        href: "/administracion/auditoria",
        allowedRoles: ["Auditor", "Supervisor", "Admin", "AdminGlobal", "SuperAdmin"],
      },
      // { label: "Acceso a proyectos", href: "/configuracion/acceso-proyectos" },
    ],
  },
  {
    // Licenciamiento / facturación / migración — solo SuperAdmin (cuenta del proveedor).
    label: "Super Admin",
    minRole: "SuperAdmin",
    children: [
      { label: "Reporte de concurrencia", href: "/licenciamiento/concurrencia" },
      { label: "Licencias", href: "/licenciamiento/licencias" },
      { label: "Funciones de IA", href: "/licenciamiento/ia" },
      { label: "Detector de firmas", href: "/licenciamiento/detector-firmas" },
      { label: "Funcionalidades", href: "/licenciamiento/funcionalidades" },
      { label: "Migraciones", href: "/licenciamiento/migraciones" },
      { label: "Datos de muestra", href: "/licenciamiento/datos-muestra" },
      { label: "Avance demo", href: "/licenciamiento/avance-demo" },
      {
        label: "Exportar / Importar",
        children: [
          { label: "Planillas",         href: "/licenciamiento/planillas" },
          { label: "Procedimientos",    href: "/licenciamiento/procedimientos" },
        ],
      },
    ],
  },
]

// ─── Lookup plano href → trail de labels ──────────────────────────────────────

type BreadcrumbItem = { label: string; href: string }

function flatten(items: MenuItem[], trail: BreadcrumbItem[]): Map<string, BreadcrumbItem[]> {
  const map = new Map<string, BreadcrumbItem[]>()
  for (const item of items) {
    if (item.href) {
      map.set(item.href, [...trail, { label: item.label, href: item.href }])
    }
    if (item.children) {
      // Items padre sin href igual aparecen en el trail con href vacío;
      // el componente Breadcrumb los renderiza como texto (no link).
      const nested = flatten(item.children, [
        ...trail,
        { label: item.label, href: item.href ?? "" },
      ])
      nested.forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

export const navBreadcrumbMap = flatten(menu, [])

// ─── Mapa ruta → restricción ─────────────────────────────────────────────────
// Cada href queda con su regla efectiva. Dos formatos:
//   { kind: "min", role }     — usar meetsRole (jerarquía lineal)
//   { kind: "allowed", roles } — lista blanca EXCLUSIVA (allowedRoles)
// Solo se incluyen rutas restringidas; las que quedan en "User" (default) no entran.
// Lo consume el RouteGuard.
type RouteRule =
  | { kind: "min"; role: AppRole }
  | { kind: "allowed"; roles: AppRole[] }

function buildRouteRoleMap(
  items: MenuItem[],
  inherited: AppRole | undefined,
  acc: Map<string, RouteRule>,
): Map<string, RouteRule> {
  for (const item of items) {
    // allowedRoles tiene precedencia sobre minRole (mismo criterio que Sidebar).
    if (item.href) {
      if (item.allowedRoles && item.allowedRoles.length > 0) {
        acc.set(item.href, { kind: "allowed", roles: item.allowedRoles })
      } else {
        const effective = item.minRole ?? inherited
        if (effective) acc.set(item.href, { kind: "min", role: effective })
      }
    }
    if (item.children) {
      const nextInherited = item.minRole ?? inherited
      buildRouteRoleMap(item.children, nextInherited, acc)
    }
  }
  return acc
}

export const routeRoleMap = buildRouteRoleMap(menu, undefined, new Map())

/**
 * Regla de autorización para una ruta (por prefijo más específico). Devuelve
 * null si la ruta no está restringida. Consumido por el RouteGuard, que evalúa
 * `kind` para decidir cómo chequear los roles del user.
 */
export function ruleForPath(pathname: string): RouteRule | null {
  let best: { href: string; rule: RouteRule } | null = null
  for (const [href, rule] of routeRoleMap) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!best || href.length > best.href.length) best = { href, rule }
    }
  }
  return best?.rule ?? null
}

// Etiquetas para segmentos dinámicos o rutas sin entrada en el menú
export const segmentLabels: Record<string, string> = {
  dashboard:     "Dashboard",
  administracion: "Administración",
  auditoria:     "Control de cambios",
  ejecucion:     "Ejecución",
  registros:     "Registros",
  checklist:     "Checklist",
  alcance:       "Alcance",
  coordinacion:  "Coordinación",
  configuracion: "Configuración",
  sistemas:      "Sistemas",
  subsistemas:   "Subsistemas",
  elementos:     "Elementos",
  tareas:        "Tareas",
  planillas:     "Planillas",
  proyectos:     "Proyectos",
  proyecto:      "Proyecto",
  usuarios:      "Usuarios",
  perfil:        "Mi perfil",
  "mis-firmas":  "Mis firmas",
  clientes:      "Clientes",
  contratistas:  "Contratistas",
  reporte:       "Reporte",
  "listado-indice": "Listado índice",
  databook:      "Databook",
  certificados:  "Certificados",
  historial:     "Historial",
  "avance-demo": "Avance demo",
  avance:        "Avance",
  especialidades: "Especialidades",
  estadisticas:                "Estadísticas",
  planificacion:               "Planificación",
  estimador:                   "Estimador",
  generador:                   "Generador",
  versiones:                   "Versiones",
  manual:                      "Planificación manual",
  "avance-subsistemas":        "Avance por subsistemas",
  "avance-areas":              "Avance por áreas",
  "avance-modulos":            "Avance por módulos",
  "cuantitativo-subsistemas":  "Cuantitativo por subsistemas",
  "avance-programado":         "Avance programado",
  "planificacion-gantt":       "Planificación (Gantt)",
  skyline:                     "Skyline (carga)",
  "estado-pendientes":         "Estado de pendientes",
  importacion:   "Importación masiva",
  "importacion-tareas": "Importar tareas",
  "importacion-planificacion": "Importar planificación",
  "importacion-pendientes": "Importar pendientes",
  "valores-precargados-importacion": "Importar valores precargados",
  pendientes:    "Pendientes",
  "pendientes-categorias": "Categorías de pendientes",
  "pendientes-tipos":      "Tipos de pendientes",
  "pendientes-acciones":   "Acciones de pendientes",
  "pendientes-motivos":    "Motivos de pendientes",
  "pendientes-catalogo":   "Catálogo maestro de pendientes",
  "importacion-maestro-pendientes": "Importar / Exportar catálogo maestro",
  "modelo-3d":             "Modelo 3D",
  licenciamiento:          "Licenciamiento",
  licencias:               "Licencias",
  funcionalidades:         "Funcionalidades",
  concurrencia:            "Reporte de concurrencia",
  ia:                      "Funciones de IA",
  areas:                   "Áreas",
  modulos:                 "Módulos",
  "test-groups":           "Paquetes de prueba",
  asignacion:              "Asignar a paquetes",
}
