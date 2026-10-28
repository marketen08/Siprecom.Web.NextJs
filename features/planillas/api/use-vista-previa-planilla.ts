import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/** Espera después del último cambio antes de regenerar: evita un PDF por cada click seguido. */
const DEBOUNCE_MS = 600

/** Canal entre el diseñador y la vista previa abierta en otra ventana. */
export const CANAL_VISTA_PREVIA = "siprecom-planilla-vista-previa"

export interface MensajeVistaPrevia {
  planillaId: string
  version: string
}

/**
 * Huella del diseño: cambia solo si cambia el contenido de la estructura. Usar
 * `dataUpdatedAt` regeneraría el PDF en cada refetch por foco aunque nada cambiara.
 */
export function useVersionDiseno(estructura: unknown): string {
  return useMemo(() => {
    const s = JSON.stringify(estructura ?? null)
    let h = 5381
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
    return `${s.length}-${(h >>> 0).toString(36)}`
  }, [estructura])
}

/**
 * Páginas del PDF en blanco como imágenes, regeneradas cuando cambia `version`.
 * Mientras se regenera sigue mostrando las anteriores (sin parpadeo).
 */
export function useVistaPreviaPlanilla(planillaId: string, version: string, enabled: boolean) {
  const [versionEstable, setVersionEstable] = useState(version)
  useEffect(() => {
    const t = setTimeout(() => setVersionEstable(version), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [version])

  return useQuery({
    // Fuera del prefijo ["planillas"] a propósito: la regeneración la maneja `version`,
    // no las invalidaciones genéricas del módulo.
    queryKey: ["planilla-vista-previa", planillaId, versionEstable],
    queryFn: () =>
      apiClient.get<{ paginas: string[] }>(`/api/planillas/${planillaId}/pdf/blanco/paginas`),
    enabled: enabled && !!planillaId,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
