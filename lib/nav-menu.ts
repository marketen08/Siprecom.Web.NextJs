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
   * Puerta ALTERNATIVA al rol: si el usuario tiene este permiso, el item se muestra
   * aunque no llegue al `minRole`. Los otros gates son condiciones que se suman
   * (AND); éste es el único que perdona.
   *
   * Existe por el tablero de calidad: lo ven los supervisores y, además, la gente
   * del área de seguimiento, que controla el circuito sin tener jefatura. Esa
   * segunda puerta no se puede expresar bajando el `minRole` —dejaría entrar a
   * cualquier User— ni con `allowedRoles`, porque no es un rol.
   */
  permiteAdemas?: PermisoExtraKey
  /**
   * Badge dinámico a mostrar al lado del label. El Sidebar mapea cada key a un
   * componente que hace su propio fetch. Sirve para contadores de "hay pendiente"
   * sin acoplar el menu a los hooks de datos.
   * Keys soportadas: `"tareas-pendientes-mias"`.
   */
  badge?: SidebarBadgeKey
}

/** Permisos que no son roles y que el menú consulta. Los resuelve el Sidebar. */
export type PermisoExtraKey = "area-seguimiento-calidad"

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
      { label: "Paro de planta",         href: "/ejecucion/paro-planta", requiereFuncionalidad: "PARO_PLANTA" },
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
  // Calidad — QA/QC del proyecto. El item se oculta salvo que el proyecto tenga
  // habilitada la funcionalidad: el módulo arranca apagado y se prende por
  // proyecto, así que sin el flag no hay nada que mostrar.
  {
    label: "Calidad",
    minRole: "Consultor",
    requiereFuncionalidad: "CALIDAD_NO_CONFORMIDADES",
    children: [{ label: "Informes", href: "/calidad/no-conformidades" }],
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
          {
            // El tablero de Calidad. Pide el flag del módulo —sin informes no hay nada
            // que tabular— y lo ven Supervisor para arriba o el área de seguimiento.
            label: "Estado de calidad",
            href: "/estadisticas/estado-calidad",
            minRole: "Supervisor",
            permiteAdemas: "area-seguimiento-calidad",
            requiereFuncionalidad: "CALIDAD_NO_CONFORMIDADES",
          },
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
      {
        // Baja a Admin: estos catalogos son vocabulario de la casa -los administra
        // AdminGlobal- pero el Admin los necesita VER para cargar alcance y para entender
        // que opciones va a elegir su gente. Las pantallas se muestran en solo lectura
        // (components/catalogo-solo-lectura).
        label: "Catálogos",
        minRole: "Admin",
        children: [
          { label: "Especialidades",    href: "/configuracion/especialidades" },
          // Tipos de elemento se abre a Admin: administra los de los equipos a los que
          // tiene acceso y ve los globales en lectura. El backend acota qué puede editar
          // — ver Docs/PLAN-EQUIPOS-ADMINISTRACION-PLANILLAS.md. Especialidades y Niveles
          // siguen en AdminGlobal: cambian poco y no tienen dueño.
          { label: "Tipos de elemento", href: "/configuracion/elementos-tipos", minRole: "Admin" },
          { label: "Niveles",           href: "/configuracion/niveles" },
        ],
      },
      {
        // Mismo criterio que Catalogos: el Admin ve los catalogos de pendientes en solo
        // lectura. Son las opciones del wizard que usa su gente y los ambitos que configura
        // en la matriz de su proyecto, asi que esconderlos lo deja configurando a ciegas.
        label: "Pendientes",
        minRole: "Admin",
        children: [
          { label: "Ámbitos",             href: "/configuracion/pendientes-ambitos" },
          { label: "Categorías",          href: "/configuracion/pendientes-categorias" },
          { label: "Tipos",               href: "/configuracion/pendientes-tipos" },
          { label: "Acciones",            href: "/configuracion/pendientes-acciones" },
          { label: "Motivos",             href: "/configuracion/pendientes-motivos" },
          { label: "Catálogo maestro",    href: "/configuracion/pendientes-catalogo" },
          // Importar / Exportar NO: escribe el catalogo entero de una, asi que queda en
          // AdminGlobal. Decision tomada, no un olvido.
          {
            label: "Importar / Exportar",
            href: "/configuracion/importacion-maestro-pendientes",
            minRole: "AdminGlobal",
          },
        ],
      },
      {
        // Mismo criterio que Pendientes: catalogos globales, los administra AdminGlobal y
        // el Admin los ve en solo lectura. El subgrupo pide el flag del modulo porque sin
        // Calidad prendido no hay donde usar estos tipos ni estos motivos.
        label: "Calidad",
        minRole: "Admin",
        requiereFuncionalidad: "CALIDAD_NO_CONFORMIDADES",
        children: [
          { label: "Tipos de informe", href: "/configuracion/calidad-tipos" },
          { label: "Motivos",          href: "/configuracion/calidad-motivos" },
        ],
      },
      {
        // Sub-grupo abierto a Admin+ para que "Colecciones de planillas"
        // (operativo, gestión de scope por proyecto) sea visible. Los otros
        // ítems catálogos siguen restringidos a AdminGlobal con minRole
        // explícito — Admin no los va a ver aunque abra el submenu.
        label: "Planillas y campos",
        minRole: "Admin",
        children: [
          // "Colecciones" y no "Grupos": ya hay grupos de usuarios y equipos de
          // administradores, los dos de personas. La ruta y las entidades siguen
          // diciendo PlanillaGrupo — el rename es sólo de la etiqueta.
          {
            label: "Colecciones de planillas",
            href: "/configuracion/planillas-grupos",
            minRole: "Admin",
            // Se puede apagar entera: en un catálogo chico, agrupar cuesta más de lo
            // que ordena. Con el flag apagado todo proyecto usa todas las planillas.
            requiereFuncionalidad: "COLECCIONES_PLANILLAS",
          },
          // Campos se abre a Admin: ya tiene dueño por equipo y la pantalla acota las
          // acciones por fila. Se había quedado afuera cuando se implementó eso.
          { label: "Campos",         href: "/configuracion/campos",         minRole: "Admin" },
          // Planillas se abre a Admin: administra las de los equipos a los que tiene
          // acceso, y las globales las ve en lectura (de ahí clona). El backend acota qué
          // puede editar — ver Docs/PLAN-EQUIPOS-ADMINISTRACION-PLANILLAS.md.
          { label: "Planillas",      href: "/configuracion/planillas",      minRole: "Admin" },
          // Equipos NO va acá: son equipos de administradores, no de planillas.
          // Las planillas son su primer uso, pero el agrupamiento es de personas y
          // va a servir para más catálogos. Vive en "Administración del sistema",
          // al lado de Usuarios y Grupos de usuarios.
          // Procedimientos se abre a Admin desde que tienen equipo dueño: administra los de
          // su equipo y los globales los ve en lectura, igual que con Planillas. El backend
          // acota qué puede editar — ver Docs/ANALISIS-CAMPOS-POR-EQUIPO.md.
          { label: "Procedimientos", href: "/configuracion/procedimientos", minRole: "Admin" },
        ],
      },
      {
        // Baja a Admin: puede dar de alta clientes y contratistas -lo necesita para
        // crear un proyecto- pero no editar ni borrar los que ya existen, porque su nombre
        // sale en los reportes y certificados de los proyectos de todos los equipos.
        label: "Organización",
        minRole: "Admin",
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
      // Equipos de administradores. Agrupa personas, igual que el ítem de arriba, de
      // ahí que sean vecinos: Grupos de usuarios autoriza acciones operativas
      // (pendientes) y Equipos acota qué catálogos administra cada uno. Su primer
      // uso son las planillas (ver Docs/PLAN-EQUIPOS-ADMINISTRACION-PLANILLAS.md),
      // pero no es una configuración de planillas.
      {
        label: "Equipos",
        href: "/configuracion/equipos",
        minRole: "AdminGlobal",
        // Se puede apagar entera: si un solo equipo administra todo el catálogo, la
        // estructura es puro trámite. Con el flag apagado cualquier Admin administra
        // todas las planillas.
        requiereFuncionalidad: "EQUIPOS_ADMINISTRACION",
      },
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
  sugerencias:   "Traer de otras obras",
  planillas:     "Planillas",
  // El segmento de la ruta sigue siendo planillas-grupos (las entidades se llaman
  // PlanillaGrupo); en la UI el concepto se llama "colecciones".
  "planillas-grupos": "Colecciones de planillas",
  equipos:       "Equipos",
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
  "estado-calidad":            "Estado de calidad",
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
  "calidad-tipos":         "Tipos de informe",
  "calidad-motivos":       "Motivos de informes",
  "importacion-maestro-pendientes": "Importar / Exportar catálogo maestro",
  "modelo-3d":             "Modelo 3D",
  licenciamiento:          "Licenciamiento",
  licencias:               "Licencias",
  funcionalidades:         "Funcionalidades",
  concurrencia:            "Reporte de concurrencia",
  ia:                      "Funciones de IA",
  areas:                   "Áreas",
  modulos:                 "Módulos",
  // La ruta sigue diciendo no-conformidades porque los QR de los informes ya
  // emitidos apuntan ahí; lo que cambia es cómo se llama en la navegación.
  "no-conformidades":      "Informes de calidad",
  "test-groups":           "Paquetes de prueba",
  asignacion:              "Asignar a paquetes",
}

// ─── Rutas navegables fuera del menú ─────────────────────────────────────────
// Páginas reales que no son un ítem del menú pero a las que sí se puede navegar.
// Son el complemento de `navBreadcrumbMap` para decidir si una miga lleva link.
//
// Por qué hace falta: el Breadcrumb, cuando la ruta no está en el menú, arma un
// item por segmento y le pone como href el prefijo acumulado. Eso generaba links
// a rutas inexistentes — `/alcance/proyectos` no es una página, solo existe
// `/alcance/proyectos/[id]` — y Next los prefetchea, así que la consola se
// llenaba de 404 y el usuario que clickeaba la miga se comía un error.
// Relevado el 2026-09-24: 24 prefijos rotos generados por 22 páginas.
//
// El default seguro es NO linkear: si alguien agrega una ruta anidada y olvida
// sumarla acá, la miga queda como texto — molesto, pero no roto.
const RUTAS_NAVEGABLES_EXTRA: RegExp[] = [
  /^\/alcance$/,
  /^\/alcance\/proyectos\/[^/]+$/,
  /^\/alcance\/test-groups\/[^/]+$/,
  /^\/configuracion\/usuarios\/[^/]+$/,
]

/** ¿Este path corresponde a una página a la que se puede navegar? */
export function esRutaNavegable(href: string): boolean {
  if (!href) return false
  if (navBreadcrumbMap.has(href)) return true
  return RUTAS_NAVEGABLES_EXTRA.some((re) => re.test(href))
}
