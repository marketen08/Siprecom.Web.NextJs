import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"
import type {
  FirmaMasivaContexto,
  FirmaMasivaFiltro,
  FirmaMasivaFirmarInput,
  FirmaMasivaOpciones,
  FirmaMasivaPreview,
  FirmaMasivaRegistro,
  FirmaMasivaResultado,
} from "@/features/firma-masiva/types"

type Envuelto<T> = { data: T; message: string }
type Pagina<T> = { data: T[]; total: number; page: number; pageSize: number }

/** El filtro como query params. Los vacíos no se mandan, para que la URL se lea. */
function comoParams(filtro: FirmaMasivaFiltro, extra?: Record<string, string | number>) {
  return {
    proyectoId: filtro.proyectoId,
    rolNombre: filtro.rolNombre,
    ...(filtro.subSistemaId ? { subSistemaId: filtro.subSistemaId } : {}),
    ...(filtro.tareaId ? { tareaId: filtro.tareaId } : {}),
    ...(filtro.especialidadId ? { especialidadId: filtro.especialidadId } : {}),
    ...(filtro.planillaId ? { planillaId: filtro.planillaId } : {}),
    ...(filtro.excluirPropios ? { excluirPropios: "true" } : {}),
    ...(filtro.soloMisTareas ? { soloMisTareas: "true" } : {}),
    ...(extra ?? {}),
  }
}

/**
 * Si la pantalla está disponible, con qué roles y con qué tope. Es lo primero que
 * se pide: sin esto no se sabe si hay algo que mostrar.
 */
export function useGetFirmaMasivaContexto(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ["firma-masiva", "contexto", proyectoId],
    queryFn: () =>
      apiClient.get<Envuelto<FirmaMasivaContexto>>("/api/firma-masiva/contexto", {
        proyectoId: proyectoId ?? "",
      }),
    enabled: !!proyectoId,
  })
}

export function useGetFirmaMasivaPendientes(
  filtro: FirmaMasivaFiltro | null,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["firma-masiva", "pendientes", filtro, page, pageSize],
    queryFn: () =>
      apiClient.get<Envuelto<Pagina<FirmaMasivaRegistro>>>(
        "/api/firma-masiva/pendientes",
        comoParams(filtro!, { page, pageSize }),
      ),
    enabled: !!filtro?.proyectoId && !!filtro?.rolNombre,
  })
}

/** Los grupos con los que se arma un lote homogéneo, con su conteo. */
export function useGetFirmaMasivaOpciones(filtro: FirmaMasivaFiltro | null) {
  return useQuery({
    queryKey: ["firma-masiva", "opciones", filtro],
    queryFn: () =>
      apiClient.get<Envuelto<FirmaMasivaOpciones>>(
        "/api/firma-masiva/opciones",
        comoParams(filtro!),
      ),
    enabled: !!filtro?.proyectoId && !!filtro?.rolNombre,
  })
}

/**
 * El conteo exacto de lo que se va a firmar, resuelto por el servidor. Se pide al
 * abrir la confirmación: si entre la selección y el OK alguien firmó algo, este
 * número es el que baja, y es el que se le muestra.
 */
export function usePreviewFirmaMasiva() {
  return useMutation({
    mutationFn: (input: FirmaMasivaFirmarInput) =>
      apiClient.post<Envuelto<FirmaMasivaPreview>>("/api/firma-masiva/preview", input),
  })
}

export function useFirmarLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FirmaMasivaFirmarInput) =>
      apiClient.post<Envuelto<FirmaMasivaResultado>>("/api/firma-masiva/firmar", input),
    onSuccess: () => {
      // Lo mismo que invalida una firma de a uno —la firma mueve estados de la ET,
      // el avance y la cola— más la pantalla de lote, que acaba de perder filas.
      invalidarPostCargaRegistro(qc)
      void qc.invalidateQueries({ queryKey: ["firma-masiva"] })
    },
  })
}
