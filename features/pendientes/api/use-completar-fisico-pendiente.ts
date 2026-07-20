"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

interface Vars {
  archivo: File
  observaciones?: string | null
  qrOverrideDetalle?: string | null
}

/**
 * Sube un PDF firmado en papel al endpoint de carga física. Cierra el pendiente
 * (Estado → Cerrado) sin pasar por Iniciar / Enviar a aprobación / Aprobar.
 * El backend rechaza si el pendiente ya tiene PDF físico cargado.
 */
export function useCompletarFisicoPendiente(pendienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivo, observaciones, qrOverrideDetalle }: Vars) => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      if (observaciones) fd.append("observaciones", observaciones)
      if (qrOverrideDetalle) fd.append("qrOverrideDetalle", qrOverrideDetalle)

      const res = await fetch(`/api/pendientes/${pendienteId}/completar/fisico`, {
        method: "POST",
        body: fd,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message ?? `Error ${res.status} al cargar el PDF físico.`)
      }
      return data
    },
    onSuccess: () => {
      // Refrescamos todas las vistas que consumen el pendiente + listado.
      qc.invalidateQueries({ queryKey: ["pendiente", pendienteId] })
      qc.invalidateQueries({ queryKey: ["pendientes"] })
    },
  })
}
