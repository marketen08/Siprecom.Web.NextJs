import type { AppRole } from "@/lib/roles"

export type MenuItem = {
  label: string
  href?: string
  children?: MenuItem[]
  /**
   * Rol mínimo para ver/entrar a este item (y sus hijos, salvo que el hijo
   * defina uno propio). Si se omite, hereda del ancestro; default "User".
   */
  minRole?: AppRole
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
}

export const menu: MenuItem[] = [
  {
    label: "Gestión de proyecto",
    children: [
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    label: "Ejecución",
    children: [
      { label: "Avance por sistemas",     href: "/ejecucion/sistemas" },
      { label: "Avance por subsistemas",  href: "/ejecucion/subsistemas" },
      { label: "Avance por elementos",    href: "/ejecucion/elementos" },
      { label: "Avance por áreas",        href: "/ejecucion/areas" },
      { label: "Avance por módulos",      href: "/ejecucion/modulos" },
      { label: "Paquetes de prueba",       href: "/ejecucion/test-groups" },
      { label: "Pendientes",              href: "/ejecucion/pendientes" },
      { label: "Modelo 3D",               href: "/ejecucion/modelo-3d", requiereFuncionalidad: "MAQUETA_3D" },
      { label: "Mis firmas",              href: "/mis-firmas", requiereFirmas: true },
    ],
  },
  {
    label: "Análisis",
    children: [
      {
        label: "Reporte",
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
          { label: "Estado de pendientes",         href: "/estadisticas/estado-pendientes" },
        ],
      },
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
    ],
  },
  {
    label: "Alcance",
    minRole: "Supervisor",
    children: [
      { label: "Proyectos",    href: "/alcance/proyectos" },
      { label: "Sistemas",     href: "/alcance/sistemas" },
      { label: "Subsistemas",  href: "/alcance/subsistemas" },
      { label: "Elementos",    href: "/alcance/elementos" },
      { label: "Tareas",       href: "/alcance/tareas" },
      { label: "Áreas",        href: "/alcance/areas" },
      { label: "Asignar a áreas", href: "/alcance/areas/asignacion" },
      { label: "Módulos",      href: "/alcance/modulos" },
      { label: "Paquetes de prueba", href: "/alcance/test-groups" },
      { label: "Asignar a paquetes",  href: "/alcance/test-groups/asignacion" },
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
    label: "Configuración",
    minRole: "Admin",
    children: [
      { label: "Especialidades",    href: "/configuracion/especialidades" },
      { label: "Tipos de elemento", href: "/configuracion/elementos-tipos" },
      { label: "Importar tipos", href: "/configuracion/catalogos" },
      { label: "Niveles",           href: "/configuracion/niveles" },
      { label: "Campos",            href: "/configuracion/campos" },
      { label: "Planillas",         href: "/configuracion/planillas" },
      { label: "Procedimientos",    href: "/configuracion/procedimientos" },
      { label: "Categorías de pendientes", href: "/configuracion/pendientes-categorias" },
      { label: "Tipos de pendientes",      href: "/configuracion/pendientes-tipos" },
      { label: "Clientes",          href: "/configuracion/clientes" },
      { label: "Contratistas",      href: "/configuracion/contratistas" },
    ],
  },
  {
    // Gestión de usuarios — separada de la config de catálogos.
    label: "Administración del sistema",
    minRole: "Admin",
    children: [
      { label: "Usuarios",          href: "/configuracion/usuarios" },
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
      { label: "Funcionalidades", href: "/licenciamiento/funcionalidades" },
      { label: "Migraciones", href: "/licenciamiento/migraciones" },
      { label: "Datos de muestra", href: "/licenciamiento/datos-muestra" },
      { label: "Avance demo", href: "/licenciamiento/avance-demo" },
      {
        label: "Exportar / Importar",
        children: [
          { label: "Planillas",         href: "/licenciamiento/planillas" },
          { label: "Procedimientos",    href: "/licenciamiento/procedimientos" },
          { label: "Tipos de elementos", href: "/configuracion/catalogos" },
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

// ─── Mapa ruta → rol mínimo ───────────────────────────────────────────────────
// Cada href queda con el rol mínimo efectivo (el propio o el heredado del
// ancestro). Solo se incluyen rutas restringidas (Supervisor/Admin); las que
// quedan en "User" (default) no entran al mapa. Lo consume el RouteGuard.
function buildRouteRoleMap(
  items: MenuItem[],
  inherited: AppRole | undefined,
  acc: Map<string, AppRole>,
): Map<string, AppRole> {
  for (const item of items) {
    const effective = item.minRole ?? inherited
    if (item.href && effective) acc.set(item.href, effective)
    if (item.children) buildRouteRoleMap(item.children, effective, acc)
  }
  return acc
}

export const routeRoleMap = buildRouteRoleMap(menu, undefined, new Map())

/**
 * Rol mínimo requerido para una ruta. Hace match por prefijo más específico
 * (para cubrir subrutas dinámicas, ej. /alcance/proyectos/{id} hereda de
 * /alcance/proyectos). Devuelve null si la ruta no está restringida.
 */
export function requiredRoleForPath(pathname: string): AppRole | null {
  let best: { href: string; role: AppRole } | null = null
  for (const [href, role] of routeRoleMap) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!best || href.length > best.href.length) best = { href, role }
    }
  }
  return best?.role ?? null
}

// Etiquetas para segmentos dinámicos o rutas sin entrada en el menú
export const segmentLabels: Record<string, string> = {
  dashboard:     "Dashboard",
  ejecucion:     "Ejecución",
  registros:     "Registros",
  checklist:     "Checklist",
  alcance:       "Alcance",
  configuracion: "Configuración",
  sistemas:      "Sistemas",
  subsistemas:   "Subsistemas",
  elementos:     "Elementos",
  tareas:        "Tareas",
  planillas:     "Planillas",
  proyectos:     "Proyectos",
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
  "estado-pendientes":         "Estado de pendientes",
  importacion:   "Importación masiva",
  "importacion-tareas": "Importar tareas",
  "importacion-planificacion": "Importar planificación",
  "importacion-pendientes": "Importar pendientes",
  "valores-precargados-importacion": "Importar valores precargados",
  pendientes:    "Pendientes",
  "pendientes-categorias": "Categorías de pendientes",
  "pendientes-tipos":      "Tipos de pendientes",
  "modelo-3d":             "Modelo 3D",
  licenciamiento:          "Licenciamiento",
  licencias:               "Licencias",
  funcionalidades:         "Funcionalidades",
  concurrencia:            "Reporte de concurrencia",
  areas:                   "Áreas",
  modulos:                 "Módulos",
  "test-groups":           "Paquetes de prueba",
  asignacion:              "Asignar a paquetes",
}
