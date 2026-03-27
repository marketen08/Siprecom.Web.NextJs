"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItem = {
  label: string
  href?: string
  children?: MenuItem[]
}

const menu: MenuItem[] = [
  {
    label: "Gestión de proyecto",
    children: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Avance por sistemas", href: "/dashboard/sistemas" },
      { label: "Avance por subsistemas", href: "/dashboard/subsistemas" },
      { label: "Avance por elementos", href: "/dashboard/elementos" },
      { label: "Registros", href: "/dashboard/registros" },
      { label: "Pendientes", href: "/dashboard/pendientes" },
    ],
  },
  {
    label: "Análisis",
    children: [
      {
        label: "Reporte",
        children: [
          { label: "Avance del proyecto", href: "/dashboard/reporte/avance" },
          { label: "Listado índice", href: "/dashboard/reporte/listado-indice" },
          { label: "Tareas realizadas", href: "/dashboard/reporte/tareas" },
          { label: "Listado de pendientes", href: "/dashboard/reporte/pendientes" },
        ],
      },
      { label: "Estadísticas", href: "/dashboard/estadisticas" },
      { label: "Avance por subsistemas", href: "/dashboard/avance-subsistemas" },
      { label: "Cuantitativo por subsistemas", href: "/dashboard/cuantitativo-subsistemas" },
      { label: "Avance programado", href: "/dashboard/avance-programado" },
      { label: "Avance sugerido", href: "/dashboard/avance-sugerido" },
      { label: "Estado de pendientes", href: "/dashboard/estado-pendientes" },
    ],
  },
  {
    label: "Alcance",
    children: [
      { label: "Sistemas", href: "/alcance/sistemas" },
      { label: "Subsistemas", href: "/alcance/subsistemas" },
      { label: "Elementos", href: "/alcance/elementos" },
      { label: "Planillas", href: "/alcance/planillas" },
    ],
  },
  {
    label: "Configuración de usuarios",
    children: [
      { label: "Usuarios", href: "/configuracion/usuarios" },
      { label: "Acceso a proyectos", href: "/configuracion/acceso-proyectos" },
      { label: "Empresas", href: "/configuracion/empresas" },
    ],
  },
]

function NavLink({ href, label, depth }: { href: string; label: string; depth: number }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      style={{ paddingLeft: 16 + depth * 12 }}
      className={cn(
        "block py-1.5 pr-4 text-sm rounded-md transition-colors duration-150",
        isActive
          ? "bg-white/20 text-white font-medium"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </Link>
  )
}

function SidebarItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const [open, setOpen] = useState(true)

  if (item.href && !item.children) {
    return <NavLink href={item.href} label={item.label} depth={depth} />
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: 16 + depth * 12 }}
        className={cn(
          "w-full flex items-center justify-between pr-4 py-2 text-sm font-semibold rounded-md",
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

      {/* Animación suave con grid-template-rows */}
      <div
        className="overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 space-y-0.5 pb-1">
            {item.children?.map((child) => (
              <SidebarItem key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[#0f2d52] overflow-y-auto z-40">
      <nav className="py-4 space-y-1">
        {menu.map((section) => (
          <SidebarItem key={section.label} item={section} depth={0} />
        ))}
      </nav>
    </aside>
  )
}
