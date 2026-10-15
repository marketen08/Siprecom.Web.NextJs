"use client"

import { useState } from "react"
import { Copy, Info } from "lucide-react"

import type { PlanillaCampoDetalle } from "@/features/planillas/types"
import { useApropiarCampo } from "@/features/campos/api/use-apropiar-campo"
import { useGetCampoUso } from "@/features/campos/api/use-get-campo-uso"
import { Button } from "@/components/ui/button"
import { ErrorEscrituraCampo } from "@/features/campos/components/error-escritura-campo"

/**
 * Explica por qué un campo no se puede editar acá y ofrece la salida: apropiárselo.
 *
 * Es el reverso del problema que el modelo de dueños introduce. Un campo global —FECHA,
 * SERVICIO, TIPO— lo comparten decenas de planillas, así que editarlo en el lugar le
 * cambiaría el formulario a todo el mundo; por eso sólo lo toca un AdminGlobal. Apropiarse
 * clona el campo al equipo del usuario y re-apunta SÓLO esta planilla.
 *
 * El diálogo dice cuántas otras planillas lo usan antes de confirmar. Ese número es lo que
 * justifica la operación: con "1 planilla" el usuario entiende que apenas se duplica algo,
 * y con "25" entiende por qué no se puede editar en el lugar.
 *
 * No se clona en silencio al fallar una escritura a propósito: el usuario tiene que saber
 * que a partir de ahora tiene una copia y no el campo de la casa.
 */
export function ApropiarCampoAviso({
  campo,
  planillaId,
}: {
  campo: PlanillaCampoDetalle
  planillaId: string
}) {
  const [confirmando, setConfirmando] = useState(false)
  const apropiar = useApropiarCampo(planillaId)

  // El uso se pide sólo al abrir el diálogo: en una planilla con 40 campos no editables,
  // pedirlo de entrada serían 40 requests para un número que nadie está mirando.
  const { data: usoResp } = useGetCampoUso(confirmando ? campo.campoId : null)
  const otras = (usoResp?.data ?? []).filter((p) => p.planillaId !== planillaId)

  if (campo.campoPuedeEditar !== false) return null

  const esGlobal = !campo.campoEquipoId

  // El campo de otro equipo también se puede apropiar: la copia es del tuyo y la otra
  // planilla sigue con la suya. Lo que cambia es el texto, porque el motivo es distinto.
  const motivo = esGlobal
    ? "Este campo es global: lo comparten todas las planillas de la plataforma y lo administra un AdminGlobal."
    : `Este campo lo administra el equipo ${campo.campoEquipoNombre}.`

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs text-amber-900">
            {motivo} Para cambiarle el código, la etiqueta, el tipo, las opciones o las
            columnas <strong>en esta planilla</strong>, hacé una copia para tu equipo.
          </p>
          <p className="text-[11px] text-amber-800">
            El formato de este campo en esta planilla —alto, estilo, etiqueta alternativa—
            lo podés cambiar igual, sin copiar nada.
          </p>

          {!confirmando ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setConfirmando(true)}
            >
              <Copy className="h-3.5 w-3.5" />
              Hacer una copia para mi equipo
            </Button>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-amber-900">
                Se va a crear una copia del campo para tu equipo y{" "}
                <strong>esta planilla</strong> va a pasar a usarla.
                {otras.length > 0 ? (
                  <>
                    {" "}Las otras <strong>{otras.length} planilla{otras.length !== 1 ? "s" : ""}</strong>{" "}
                    que lo usan siguen con el campo original, sin cambios.
                  </>
                ) : (
                  " Ninguna otra planilla lo está usando."
                )}
              </p>
              <p className="text-[11px] text-amber-800">
                Los datos ya cargados en esta planilla no se tocan. Ojo después: si le
                borrás opciones a la copia, los registros viejos que las tenían quedan sin
                etiqueta.
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={apropiar.isPending}
                  onClick={() => apropiar.mutate(campo.id, { onSuccess: () => setConfirmando(false) })}
                >
                  {apropiar.isPending ? "Copiando..." : "Crear la copia"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={apropiar.isPending}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <ErrorEscrituraCampo
            error={apropiar.error instanceof Error ? apropiar.error.message : null}
          />
        </div>
      </div>
    </div>
  )
}
