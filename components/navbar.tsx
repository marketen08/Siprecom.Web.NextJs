"use client"

import Link from "next/link"
import { LayoutGrid, Menu } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { ProyectoSwitcher } from "@/components/proyecto-switcher"
import { useSidebar } from "@/components/sidebar-context"

export function Navbar() {
  const { toggle } = useSidebar()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-4 md:px-6">
      {/* Hamburger — solo mobile */}
      <button
        onClick={toggle}
        className="md:hidden -ml-1 p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <img
          src="/logosiprecom.png"
          alt="Siprecom"
          className="h-5 w-auto"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project switcher + User menu */}
      <div className="flex items-center gap-3">
        <ProyectoSwitcher />
        <Link
          href="/ejecucion/proyectos"
          className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white text-blue-900 hover:bg-gray-50 transition-colors"
          aria-label="Ver avance de todos los proyectos"
          title="Avance por proyectos"
        >
          <LayoutGrid className="h-4 w-4" />
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}
