export type MenuItem = {
  label: string
  href?: string
  children?: MenuItem[]
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
      { label: "Pendientes",              href: "/ejecucion/pendientes" },
      { label: "Mis firmas",              href: "/mis-firmas" },
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
        ],
      },
      {
        label: "Estadísticas",
        children: [
          { label: "Resumen",                      href: "/estadisticas" },
          { label: "Avance por subsistemas",       href: "/estadisticas/avance-subsistemas" },
          { label: "Cuantitativo por subsistemas", href: "/estadisticas/cuantitativo-subsistemas" },
          { label: "Avance programado",            href: "/estadisticas/avance-programado" },
          { label: "Estado de pendientes",         href: "/estadisticas/estado-pendientes" },
        ],
      },
      {
        label: "Planificación",
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
    children: [
      { label: "Proyectos",    href: "/alcance/proyectos" },
      { label: "Sistemas",     href: "/alcance/sistemas" },
      { label: "Subsistemas",  href: "/alcance/subsistemas" },
      { label: "Elementos",    href: "/alcance/elementos" },
      { label: "Tareas",       href: "/alcance/tareas" },
      { label: "Planillas",    href: "/alcance/planillas" },
      { label: "Importar datos de proyecto", href: "/alcance/importacion" },
      { label: "Importar pendientes", href: "/alcance/importacion-pendientes" },
    ],
  },
  {
    label: "Configuración",
    children: [
      { label: "Usuarios",          href: "/configuracion/usuarios" },
      // { label: "Acceso a proyectos", href: "/configuracion/acceso-proyectos" },
      { label: "Clientes",          href: "/configuracion/clientes" },
      { label: "Contratistas",      href: "/configuracion/contratistas" },
      { label: "Especialidades",    href: "/configuracion/especialidades" },
      { label: "Tipos de elemento", href: "/configuracion/elementos-tipos" },
      { label: "Campos",            href: "/configuracion/campos" },
      { label: "Procedimientos",    href: "/configuracion/procedimientos" },
      { label: "Categorías de pendientes", href: "/configuracion/pendientes-categorias" },
      { label: "Tipos de pendientes",      href: "/configuracion/pendientes-tipos" },
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
  avance:        "Avance",
  especialidades: "Especialidades",
  estadisticas:                "Estadísticas",
  planificacion:               "Planificación",
  estimador:                   "Estimador",
  generador:                   "Generador",
  versiones:                   "Versiones",
  manual:                      "Planificación manual",
  "avance-subsistemas":        "Avance por subsistemas",
  "cuantitativo-subsistemas":  "Cuantitativo por subsistemas",
  "avance-programado":         "Avance programado",
  "estado-pendientes":         "Estado de pendientes",
  importacion:   "Importación masiva",
  "importacion-pendientes": "Importar pendientes",
  pendientes:    "Pendientes",
  "pendientes-categorias": "Categorías de pendientes",
  "pendientes-tipos":      "Tipos de pendientes",
}
