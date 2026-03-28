import { UserMenu } from "@/components/user-menu"
import { ProyectoSwitcher } from "@/components/proyecto-switcher"

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 flex items-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-blue-900 font-bold text-xl tracking-wide">
          SIPRECOM
        </span>
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
