import type { QueryClient } from "@tanstack/react-query"

/**
 * Invalida los queries que quedan stale después de completar un registro (por
 * carga física manual, checklist mobile, o carga rápida por QR). Se comparte
 * entre los 3 flujos para que ninguno olvide una key.
 *
 * Prefijos usados:
 * - `["registros", registroId]` — detalle del registro (si el usuario vuelve).
 * - `["elementos-tareas"]` — sheet del elemento + lista general.
 * - `["elemento-tarea"]` — fetch puntual por id (menú lazy de acciones en listados).
 * - `["tareas-listado"]` — pantalla `/ejecucion/tareas` (paginado + counts de chips).
 * - `["avance"]` — todas las vistas de avance (elemento/subsistema/sistema/etc.).
 * - `["testgroups"]` — lista de tareas del pack si aplica.
 * - `["mis-firmas"]` — aparecen slots pendientes tras el completado.
 * - `["estadisticas"]` — curva S + KPIs.
 * - `["preservacion"]` — próximo ciclo si la tarea era de preservación.
 */
export function invalidarPostCargaRegistro(
  queryClient: QueryClient,
  registroId?: string | null,
) {
  if (registroId) {
    queryClient.invalidateQueries({ queryKey: ["registros", registroId] })
  } else {
    queryClient.invalidateQueries({ queryKey: ["registros"] })
  }
  queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
  queryClient.invalidateQueries({ queryKey: ["elemento-tarea"] })
  queryClient.invalidateQueries({ queryKey: ["tareas-listado"] })
  queryClient.invalidateQueries({ queryKey: ["avance"] })
  queryClient.invalidateQueries({ queryKey: ["testgroups"] })
  queryClient.invalidateQueries({ queryKey: ["mis-firmas"] })
  queryClient.invalidateQueries({ queryKey: ["estadisticas"] })
  queryClient.invalidateQueries({ queryKey: ["preservacion"] })
}
