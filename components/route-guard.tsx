"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { useMounted } from "@/lib/use-mounted"
import { meetsRole } from "@/lib/roles"
import { requiredRoleForPath } from "@/lib/nav-menu"

/**
 * Guard de rutas por rol. Si el usuario entra (por URL directa) a una ruta que
 * requiere un rol mayor al suyo, lo redirige al dashboard. Es una red de
 * seguridad de UX — el control real lo hace el backend con [Authorize(Roles…)].
 *
 * Render: hasta montar (SSR + 1er render cliente) deja pasar children para no
 * romper la hidratación; recién con el store ya hidratado evalúa y redirige.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const roles = useAuthStore((s) => s.user?.roles)
  const mounted = useMounted()

  const required = requiredRoleForPath(pathname)
  const allowed = !required || meetsRole(roles ?? [], required)

  useEffect(() => {
    if (mounted && !allowed) router.replace("/dashboard")
  }, [mounted, allowed, pathname, router])

  if (mounted && !allowed) return null

  return <>{children}</>
}
