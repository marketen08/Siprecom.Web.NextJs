"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"
import { useAuthStore } from "@/store/auth-store"
import { useMounted } from "@/lib/use-mounted"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { meetsRole, type AppRole } from "@/lib/roles"
import { menu, type MenuItem } from "@/lib/nav-menu"
import { SidebarBadge } from "@/components/sidebar-badge"

function NavLink({
  href, label, depth, onNavigate, badge,
}: {
  href: string
  label: string
  depth: number
  onNavigate: () => void
  /** Nodo opcional que se renderiza al final del link (contadores, dots, etc.). */
  badge?: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{ paddingLeft: 16 + depth * 12 }}
      className={cn(
        "flex items-center justify-between gap-2 py-1.5 pr-4 text-sm rounded-md transition-colors duration-150 cursor-pointer",
        isActive
          ? "bg-white/20 text-white font-medium"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className="truncate">{label}</span>
      {badge}
    </Link>
  )
}

function hasActiveChild(item: MenuItem, pathname: string): boolean {
  if (item.href && pathname.startsWith(item.href)) return true
  return item.children?.some((child) => hasActiveChild(child, pathname)) ?? false
}

/**
 * Clave estable de una sección plegable. Incluye la ruta de labels para que dos
 * secciones con el mismo nombre en distinta rama no compartan estado.
 */
function claveSeccion(label: string, parentKey?: string): string {
  return parentKey ? `${parentKey}>${label}` : label
}

/** Todas las claves de secciones plegables del menú, en cualquier nivel. */
function recolectarClaves(items: MenuItem[], parentKey?: string): string[] {
  const out: string[] = []
  for (const item of items) {
    if (!item.children?.length) continue
    const key = claveSeccion(item.label, parentKey)
    out.push(key, ...recolectarClaves(item.children, key))
  }
  return out
}

function SidebarItem({
  item, depth = 0, onNavigate, roles, inheritedMin, ocultarFirmas, funcionalidades,
  parentKey, abiertos, setAbierto,
}: {
  item: MenuItem
  depth?: number
  onNavigate: () => void
  roles: string[]
  inheritedMin?: AppRole
  ocultarFirmas: boolean
  funcionalidades: Record<string, boolean>
  /** Clave de la sección padre, para armar una clave única por rama. */
  parentKey?: string
  /**
   * Overrides explícitos de apertura, levantados al Sidebar para que el botón
   * de plegar/desplegar todo pueda actuar sobre secciones que no son sus hijas
   * directas. Sin entrada acá, la sección usa su default: abierta si contiene
   * la ruta activa.
   */
  abiertos: Record<string, boolean>
  setAbierto: (key: string, value: boolean) => void
}) {
  const pathname = usePathname()
  const key = claveSeccion(item.label, parentKey)
  const open = abiertos[key] ?? hasActiveChild(item, pathname)

  // Proyecto solo pre-firmados → no hay firmas electrónicas: ocultar "Mis firmas".
  if (item.requiereFirmas && ocultarFirmas) return null

  // Funcionalidad (feature flag) requerida y no habilitada en el proyecto activo.
  if (item.requiereFuncionalidad && funcionalidades[item.requiereFuncionalidad] === false) return null

  // Rol mínimo efectivo: el propio o el heredado del ancestro. Lo calculamos
  // siempre porque además de gatear el render, se pasa a los hijos como
  // `inheritedMin` para que la jerarquía siga bajando.
  const effectiveMin = item.minRole ?? inheritedMin

  // Lista blanca EXCLUSIVA (allowedRoles) tiene precedencia sobre la jerarquía
  // lineal (minRole). Se usa cuando roles del mismo nivel no son intercambiables
  // (ej. Auditor vs User — ambos pueden ver mucho, pero solo Auditor tiene el log).
  if (item.allowedRoles && item.allowedRoles.length > 0) {
    if (!roles?.some((r) => item.allowedRoles!.includes(r as AppRole))) return null
  } else {
    if (effectiveMin && !meetsRole(roles, effectiveMin)) return null
  }

  if (item.href && !item.children) {
    return (
      <NavLink
        href={item.href}
        label={item.label}
        depth={depth}
        onNavigate={onNavigate}
        badge={item.badge ? <SidebarBadge kind={item.badge} /> : undefined}
      />
    )
  }

  return (
    <div>
      <button
        onClick={() => setAbierto(key, !open)}
        style={{ paddingLeft: 16 + depth * 12 }}
        className={cn(
          "w-full flex items-center justify-between pr-4 py-2 text-sm font-semibold rounded-md cursor-pointer",
          "transition-colors duration-150",
          depth === 0
            ? "text-white hover:bg-white/10"
            : "text-blue-200 hover:bg-white/10 hover:text-white"
        )}
      >
        <span>{item.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-300",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      <div
        className="overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 space-y-0.5 pb-1">
            {item.children?.map((child) => (
              <SidebarItem
                key={child.label}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
                roles={roles}
                inheritedMin={effectiveMin}
                ocultarFirmas={ocultarFirmas}
                funcionalidades={funcionalidades}
                parentKey={key}
                abiertos={abiertos}
                setAbierto={setAbierto}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * @param drawer Si es true, el sidebar es un overlay en TODOS los tamaños (no se
 *   fija visible en desktop). Lo usa el layout fullscreen (visor 3D) para que el
 *   usuario abra la navegación con un botón sin robarle ancho permanente al
 *   viewer. Por defecto (dashboard) queda fijo en desktop.
 */
export function Sidebar({ drawer = false }: { drawer?: boolean }) {
  const { open, close } = useSidebar()
  const pathname = usePathname()
  const userRoles = useAuthStore((s) => s.user?.roles)

  // Overrides de apertura por sección. Vacío = cada una decide por su cuenta
  // (abierta si contiene la ruta activa). El botón de plegar todo escribe una
  // entrada por sección, así que un override explícito le gana al default —
  // navegar a otra sección no vuelve a abrir lo que el usuario plegó.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})
  const setAbierto = (key: string, value: boolean) =>
    setAbiertos((prev) => ({ ...prev, [key]: value }))

  const clavesTopLevel = useMemo(
    () => menu.filter((s) => s.children?.length).map((s) => claveSeccion(s.label)),
    [],
  )
  // El botón dice lo que va a hacer: si hay algo abierto pliega, si no despliega.
  // Se calcula del estado efectivo (override o default) para que no se desincronice
  // cuando el usuario abre o cierra secciones a mano.
  const algunaAbierta = clavesTopLevel.some((k) => {
    const seccion = menu.find((s) => claveSeccion(s.label) === k)
    return abiertos[k] ?? (seccion ? hasActiveChild(seccion, pathname) : false)
  })
  const plegarODesplegarTodo = () => {
    const valor = !algunaAbierta
    setAbiertos(Object.fromEntries(recolectarClaves(menu).map((k) => [k, valor])))
  }

  // Antes de montar (SSR + primer render cliente) tratamos los roles como vacíos
  // para que el HTML del server y el del cliente coincidan; tras la hidratación
  // del store (persist) mostramos las secciones según el rol real. Evita el
  // hydration mismatch y oculta lo elevado por default.
  const mounted = useMounted()
  const roles = mounted ? (userRoles ?? []) : []

  // Proyecto activo: si es solo pre-firmados físicos (sin registro digital y con
  // pre-firmado), no hay firmas electrónicas → ocultamos "Mis firmas".
  const { data: proyectos } = useGetMisProyectos()
  const activo = proyectos?.find((p) => p.esActivo)
  const ocultarFirmas = !!activo && !activo.permitirRegistroDigital && activo.registrosFisicosPreFirmados

  // Funcionalidades efectivas del proyecto activo (feature flags). Si no hay
  // proyecto activo todavía, no ocultamos nada (mapa vacío → sin filtro).
  const funcionalidades: Record<string, boolean> = activo
    ? { MAQUETA_3D: activo.maqueta3d }
    : {}

  return (
    <>
      {/* Overlay — en mobile siempre; en drawer también en desktop */}
      {open && (
        <div
          className={cn("fixed inset-0 z-30 bg-black/40", !drawer && "lg:hidden")}
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 w-64 bg-[#0f2d52] overflow-y-auto z-40",
          "transition-transform duration-300 ease-in-out",
          // Oculto por defecto, visible cuando open
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: fijo visible SOLO en modo no-drawer (dashboard)
          !drawer && "lg:translate-x-0"
        )}
      >
        <div className="flex justify-end px-3 pt-3">
          <button
            type="button"
            onClick={plegarODesplegarTodo}
            aria-label={algunaAbierta ? "Plegar todas las secciones" : "Desplegar todas las secciones"}
            title={algunaAbierta ? "Plegar todo" : "Desplegar todo"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium cursor-pointer",
              "text-blue-200 hover:bg-white/10 hover:text-white transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            )}
          >
            {algunaAbierta
              ? <><ChevronsDownUp className="h-3.5 w-3.5" /> Plegar todo</>
              : <><ChevronsUpDown className="h-3.5 w-3.5" /> Desplegar todo</>}
          </button>
        </div>

        <nav className="pb-4 pt-1 space-y-1">
          {menu.map((section) => (
            <SidebarItem
              key={section.label}
              item={section}
              depth={0}
              onNavigate={close}
              roles={roles}
              ocultarFirmas={ocultarFirmas}
              funcionalidades={funcionalidades}
              abiertos={abiertos}
              setAbierto={setAbierto}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}
