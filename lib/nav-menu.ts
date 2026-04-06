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
    ],
  },
  {
    label: "Análisis",
    children: [
      {
        label: "Reporte",
        children: [
          { label: "Avance del proyecto",   href: "/dashboard/reporte/avance" },
          { label: "Listado índice",         href: "/dashboard/reporte/listado-indice" },
          { label: "Tareas realizadas",      href: "/dashboard/reporte/tareas" },
          { label: "Listado de pendientes",  href: "/dashboard/reporte/pendientes" },
        ],
      },
      { label: "Estadísticas",              href: "/dashboard/estadisticas" },
      { label: "Avance por subsistemas",    href: "/dashboard/avance-subsistemas" },
      { label: "Cuantitativo por subsistemas", href: "/dashboard/cuantitativo-subsistemas" },
      { label: "Avance programado",         href: "/dashboard/avance-programado" },
      { label: "Avance sugerido",           href: "/dashboard/avance-sugerido" },
      { label: "Estado de pendientes",      href: "/dashboard/estado-pendientes" },
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
    ],
  },
  {
    label: "Configuración",
    children: [
      { label: "Usuarios",          href: "/configuracion/usuarios" },
      { label: "Acceso a proyectos", href: "/configuracion/acceso-proyectos" },
      { label: "Empresas",          href: "/configuracion/empresas" },
      { label: "Tipos de elemento", href: "/configuracion/elementos-tipos" },
      { label: "Procedimientos",    href: "/configuracion/procedimientos" },
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
      const nested = flatten(item.children, item.href
        ? [...trail, { label: item.label, href: item.href }]
        : trail)
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
  empresas:      "Empresas",
  reporte:       "Reporte",
  avance:        "Avance",
}
