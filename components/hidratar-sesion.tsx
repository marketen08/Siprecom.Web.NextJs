"use client"

import { useEffect } from "react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useAuthStore } from "@/store/auth-store"

/**
 * Llena el store de sesión desde `/auth/perfil` cuando hay cookie pero el store
 * está vacío.
 *
 * Por qué hace falta: `setUser` sólo se llamaba desde la pantalla de login con
 * contraseña y desde el callback de Microsoft — las dos son páginas de cliente.
 * El login federado de YPF NO pasa por ninguna: su callback es una route handler
 * server-side que setea las cookies y redirige a /dashboard. El navegador llega
 * autenticado pero con el store en null.
 *
 * Consecuencia: `user.roles` vacío. El Sidebar filtra TODO por roles, así que no
 * dibujaba un solo item, y RouteGuard rebotaba a /dashboard cualquier ruta con
 * rol. Quedaba la pantalla en blanco, sin ningún error — el usuario estaba
 * logueado de verdad, sólo que la app no sabía quién era. El menú de usuario sí
 * se veía porque lee `useGetPerfil()` y cae al store recién como fallback.
 *
 * Se resuelve acá y no en el callback de YPF a propósito: el mismo agujero se
 * abre cada vez que hay cookie sin store, y eso pasa también si el usuario borra
 * el localStorage, abre el sitio en otro navegador con la sesión viva, o si más
 * adelante se suma otro IDP federado. Reparar sólo el callback de YPF dejaría
 * los otros casos abiertos.
 *
 * El store se sigue escribiendo desde el login para no cambiar ese camino; acá
 * sólo se completa lo que falte.
 */
export function HidratarSesion() {
  const { data: perfil } = useGetPerfil()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    if (!perfil) return

    const roles = perfil.roles ?? []

    // Se escribe sólo si cambió algo. Sin esta guarda, cada render con datos
    // nuevos volvería a setear el store y dispararía otro render.
    const igual =
      user?.email === perfil.email &&
      user?.roles?.length === roles.length &&
      (user?.roles ?? []).every((r, i) => r === roles[i])

    if (igual) return

    setUser({ email: perfil.email, roles })
  }, [perfil, user, setUser])

  return null
}
