"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"
import { menu, type MenuItem } from "@/lib/nav-menu"

function NavLink({ href, label, depth, onNavigate }: { href: string; label: string; depth: number; onNavigate: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onNavigate}
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

function SidebarItem({ item, depth = 0, onNavigate }: { item: MenuItem; depth?: number; onNavigate: () => void }) {
  const [open, setOpen] = useState(true)

  if (item.href && !item.children) {
    return <NavLink href={item.href} label={item.label} depth={depth} onNavigate={onNavigate} />
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

      <div
        className="overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 space-y-0.5 pb-1">
            {item.children?.map((child) => (
              <SidebarItem key={child.label} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { open, close } = useSidebar()

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 w-64 bg-[#0f2d52] overflow-y-auto z-40",
          "transition-transform duration-300 ease-in-out",
          // Mobile: oculto por defecto, visible cuando open
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: siempre visible
          "md:translate-x-0"
        )}
      >
        <nav className="py-4 space-y-1">
          {menu.map((section) => (
            <SidebarItem key={section.label} item={section} depth={0} onNavigate={close} />
          ))}
        </nav>
      </aside>
    </>
  )
}
