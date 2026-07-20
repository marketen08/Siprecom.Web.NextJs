"use client"

import { useMutation } from "@tanstack/react-query"

export interface PendienteResolverQr {
  pendienteId: string
  codigo: number
  codigoFormateado: string
  estadoId: string
  estadoNombre: string
  descripcion: string | null
  puedeCargar: boolean
  motivo: string | null
}

/**
 * Resuelve un pendiente por su ID (leído del QR) para el flujo de carga masiva.
 * Devuelve `puedeCargar=false` si ya está en estado terminal o ya tiene PDF físico
 * cargado. El bulk uploader usa el flag para pintar la fila con el estado correcto.
 */
export function useResolverPendientePorQr() {
  return useMutation({
    mutationFn: async (pendienteId: string): Promise<PendienteResolverQr> => {
      const res = await fetch(`/api/pendientes/${pendienteId}/resolver-por-qr`)
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const err = new Error(json?.message ?? `Error ${res.status}`) as Error & { status: number }
        err.status = res.status
        throw err
      }
      return json.data as PendienteResolverQr
    },
  })
}
