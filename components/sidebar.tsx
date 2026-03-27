"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
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
      { label: "Sistemas", href: "/dashboard/sistemas" },
      { label: "Subsistemas", href: "/dashboard/subsistemas" },
      { label: "Elementos", href: "/dashboard/elementos" },
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
    label: "Configuración de usuarios",
    children: [
      { label: "Usuarios", href: "/dashboard/usuarios" },
      { label: "Acceso a proyectos", href: "/dashboard/acceso-proyectos" },
      { label: "Empresas", href: "/dashboard/empresas" },
    ],
  },
]

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        "block px-4 py-1.5 text-sm rounded-md transition-colors",
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
    return (
      <div style={{ paddingLeft: depth * 12 }}>
        <NavLink href={item.href} label={item.label} />
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2 text-sm font-semibold rounded-md transition-colors",
          depth === 0
            ? "text-white hover:bg-white/10"
            : "text-blue-200 hover:bg-white/10 hover:text-white"
        )}
        style={{ paddingLeft: depth === 0 ? 16 : depth * 12 + 16 }}
      >
        <span>{item.label}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        )}
      </button>

      {open && item.children && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <SidebarItem key={child.label} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
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
