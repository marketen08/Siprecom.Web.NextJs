import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/soldadura/types"
import type {
  Agenda, CierreEstado, Intervencion, IntervencionWrite, Parte, ParteWrite, TareaCatalogo, TareaRegla, TareaReglaWrite,
} from "@/features/soldadura/types-cierre"

/**
 * Hooks de la Fase 3: reglas de cierre, partes, intervenciones, tablero y agenda. Todo
 * cuelga de ["soldadura", "cierre", …] y cada cambio invalida ese árbol entero: una regla
 * nueva mueve el tablero, una intervención nueva mueve la agenda.
 */

const BASE = "/api/soldadura"
const RAIZ = ["soldadura", "cierre"] as const

function lista<T>(clave: string, ruta: string) {
  return () =>
    useQuery({
      queryKey: [...RAIZ, clave],
      queryFn: async () => (await apiClient.get<ApiResponse<T[]>>(`${BASE}/${ruta}`)).data,
    })
}

function abm<TDto, TWrite>(ruta: string) {
  function useInvalidar() {
    const qc = useQueryClient()
    return () => void qc.invalidateQueries({ queryKey: RAIZ })
  }
  return {
    useCreate: () => {
      const invalidar = useInvalidar()
      return useMutation({ mutationFn: (d: TWrite) => apiClient.post<ApiResponse<TDto>>(`${BASE}/${ruta}`, d), onSuccess: invalidar })
    },
    useUpdate: () => {
      const invalidar = useInvalidar()
      return useMutation({
        mutationFn: ({ id, ...d }: TWrite & { id: string }) => apiClient.put<ApiResponse<TDto>>(`${BASE}/${ruta}/${id}`, d),
        onSuccess: invalidar,
      })
    },
    useDelete: () => {
      const invalidar = useInvalidar()
      return useMutation({ mutationFn: (id: string) => apiClient.delete(`${BASE}/${ruta}/${id}`), onSuccess: invalidar })
    },
  }
}

export const useTareasCatalogo = lista<TareaCatalogo>("tareas", "cierre/tareas")
export const useRolesFirma = lista<string>("roles-firma", "cierre/roles-firma")

export const useReglas = lista<TareaRegla>("reglas", "cierre/reglas")
export const reglas = abm<TareaRegla, TareaReglaWrite>("cierre/reglas")

export const usePartes = lista<Parte>("partes", "partes")
export const partes = abm<Parte, ParteWrite>("partes")

export const useIntervenciones = lista<Intervencion>("intervenciones", "intervenciones")
export const intervenciones = abm<Intervencion, IntervencionWrite>("intervenciones")

export const useEstadoCierre = lista<CierreEstado>("estado", "cierre/estado")
export const useAgenda = lista<Agenda>("agenda", "cierre/agenda")
