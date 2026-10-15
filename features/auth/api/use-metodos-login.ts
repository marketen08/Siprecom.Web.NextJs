import { useQuery } from "@tanstack/react-query"

/**
 * Métodos de ingreso habilitados en este sitio. El backend combina el toggle del
 * SuperAdmin (Licenciamiento → Funcionalidades) con si el IDP correspondiente está
 * efectivamente configurado, así que acá sólo hay que dibujar lo que venga.
 *
 * Lo usan la pantalla de login (qué botones mostrar) y el alta de usuarios (qué
 * métodos puede elegir el admin). Comparten la queryKey, así que se resuelve una
 * sola vez por sesión.
 */
export interface MetodosLogin {
  password?: boolean
  microsoft?: boolean
  ypf?: boolean
  google?: boolean
}

export function useMetodosLogin() {
  return useQuery({
    queryKey: ["auth", "metodos"],
    queryFn: async () => {
      const res = await fetch("/api/auth/metodos", { cache: "no-store" })
      if (!res.ok) throw new Error("No se pudieron leer los métodos de ingreso")
      return (await res.json()) as MetodosLogin
    },
    staleTime: Infinity,
    retry: 1,
  })
}
