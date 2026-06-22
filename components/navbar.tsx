"use client"

import { Menu } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { ProyectoSwitcher } from "@/components/proyecto-switcher"
import { useSidebar } from "@/components/sidebar-context"

/**
 * @param ocultarHamburger Si es true, NO se renderiza el botón hamburguesa que
 *   abre el sidebar. Lo usa el layout fullscreen (visor 3D), porque esas páginas
 *   ya tienen su propio botón de menú en el header y no queremos duplicarlo.
 */
export function Navbar({ ocultarHamburger = false }: { ocultarHamburger?: boolean } = {}) {
  const { toggle } = useSidebar()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-4 md:px-6">
      {/* Hamburger — solo mobile (oculto entero si ocultarHamburger) */}
      {!ocultarHamburger && (
        <button
          onClick={toggle}
          className="md:hidden -ml-1 p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

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
        <UserMenu />
      </div>
    </header>
  )
}
