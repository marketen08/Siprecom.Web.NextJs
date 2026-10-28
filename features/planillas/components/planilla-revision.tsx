"use client"

import { useState } from "react"
import { AlertTriangle, Check } from "lucide-react"

import type { Planilla } from "../types"
import { useMarcarRevision } from "../api/use-marcar-revision"
import { Button } from "@/components/ui/button"

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

/**
 * Tilde de revisión dentro de "Editar datos". Es el mismo tilde de la columna "Rev."
 * del listado, con quién/cuándo a la vista.
 *
 * Va fuera del form y aplica al instante, igual que las colecciones: no es un dato que
 * viaje con "Guardar", y marcarla no toca la fecha de modificación de la planilla.
 */
export function PlanillaRevision({ planilla }: { planilla: Planilla }) {
  const marcar = useMarcarRevision()
  const [error, setError] = useState<string | null>(null)

  const puedeEditar = planilla.puedeEditar !== false
  const tieneTilde = !!planilla.revisadaEn
  const modificada = tieneTilde && !!planilla.modificadaDespuesDeRevisar
  const vigente = tieneTilde && !modificada

  const detalle = tieneTilde
    ? `${planilla.revisadaPorNombre ? `${planilla.revisadaPorNombre}, ` : ""}${formatFechaHora(planilla.revisadaEn!)}`
    : null

  async function aplicar(revisada: boolean) {
    setError(null)
    try {
      await marcar.mutateAsync({ id: planilla.id, revisada })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const tono = vigente
    ? "border-emerald-200 bg-emerald-50"
    : modificada
      ? "border-amber-200 bg-amber-50"
      : ""

  return (
    <div className={`space-y-2 rounded-md border p-3 ${tono}`}>
      <div className="flex items-start gap-2">
        <span
          className={
            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border "
            + (vigente
              ? "border-emerald-500 bg-emerald-500 text-white"
              : modificada
                ? "border-amber-500 bg-amber-100 text-amber-700"
                : "border-gray-300 bg-white text-transparent")
          }
          aria-hidden
        >
          {modificada ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {vigente ? "Revisada" : modificada ? "Modificada después de revisar" : "Pendiente de revisión"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {detalle
              ? `${modificada ? "Última revisión" : "Revisada por"}: ${detalle}`
              : "Marcala cuando la hayas revisado. Se aplica al instante."}
          </p>
        </div>
        {puedeEditar && (
          <div className="flex shrink-0 gap-1">
            {vigente ? (
              <Button
                type="button" variant="outline" size="sm"
                disabled={marcar.isPending}
                onClick={() => aplicar(false)}
              >
                Quitar tilde
              </Button>
            ) : (
              <>
                {modificada && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    disabled={marcar.isPending}
                    onClick={() => aplicar(false)}
                  >
                    Quitar tilde
                  </Button>
                )}
                <Button
                  type="button" size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={marcar.isPending}
                  onClick={() => aplicar(true)}
                >
                  {modificada ? "Volver a marcar" : "Marcar revisada"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
