import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * Claves de las funcionalidades que se controlan SOLO a nivel global, o sea las que
 * describen la instalación entera y no un proyecto. Las de login viven en el mismo
 * mapa pero las consume la pantalla de ingreso por su propio endpoint.
 */
export const FUNCIONALIDAD = {
  coleccionesPlanillas: "COLECCIONES_PLANILLAS",
  equiposAdministracion: "EQUIPOS_ADMINISTRACION",
} as const

/**
 * Mapa clave→habilitada de las funcionalidades globales de la plataforma.
 *
 * Hace falta aparte del mapa que viene en "mis proyectos" porque ese depende de que
 * haya un proyecto activo, y estas gobiernan pantallas tenant-wide (Equipos,
 * Colecciones de planillas): un Admin sin proyecto activo igual entra a Configuración.
 *
 * `staleTime` alto a propósito: lo cambia un SuperAdmin y casi nunca. El costo de que
 * tarde un rato en reflejarse es menor que el de pedirlo en cada navegación.
 */
export function useFuncionalidadesPlataforma() {
  return useQuery({
    queryKey: ["funcionalidades-plataforma"],
    queryFn: () => apiClient.get<Record<string, boolean>>("/api/auth/funcionalidades-plataforma"),
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * ¿Está habilitada esta funcionalidad global?
 *
 * Mientras el mapa carga devuelve **true**, al revés que el criterio del menú. Acá se
 * usa para esconder partes de una pantalla que ya está abierta: arrancar en false
 * haría aparecer columnas y badges un instante después de pintar, que se lee como un
 * salto. El menú puede permitirse lo contrario porque se dibuja una sola vez.
 *
 * El backend igual corta las escrituras, así que un render optimista no habilita nada.
 */
export function useFuncionalidadPlataforma(clave: string): boolean {
  const { data } = useFuncionalidadesPlataforma()
  if (!data) return true
  return data[clave] !== false
}
