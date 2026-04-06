"use client"

import { useState } from "react"
import { CheckCircle2, Clock, Loader2, PenLine } from "lucide-react"
import { useGetFirmasStatus } from "@/features/registros/api/use-get-firmas-status"
import { useFirmarRegistro } from "@/features/registros/api/use-firmar-registro"
import type { RegistroFirmaSlot } from "@/features/registros/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Props {
  registroId: string
  /** Si se pasa, solo se muestran las firmas (sin el formulario) */
  soloLectura?: boolean
}

export function FirmaPanel({ registroId, soloLectura = false }: Props) {
  const { data, isLoading, isError } = useGetFirmasStatus(registroId)
  const firmar = useFirmarRegistro(registroId)

  const [slotSeleccionado, setSlotSeleccionado] = useState<RegistroFirmaSlot | null>(null)
  const [observaciones, setObs] = useState("")
  const [firmado, setFirmado] = useState(false)

  const status = data?.data
  const slots = status?.slots ?? []
  const pendientes = slots.filter((s) => !s.firmaId)
  const completadas = slots.filter((s) => s.firmaId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando estado de firmas...
      </div>
    )
  }

  if (isError || !status) return null

  // Sin slots configurados → no mostrar el panel
  if (slots.length === 0) return null

  async function handleFirmar() {
    if (!slotSeleccionado) return
    await firmar.mutateAsync({ rolFirmante: slotSeleccionado.rolNombre, observaciones: observaciones || undefined })
    setFirmado(true)
    setSlotSeleccionado(null)
    setObs("")
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">

      {/* Título */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
          <PenLine className="h-3.5 w-3.5" />
          Firmas digitales
        </span>
        <span className="text-xs text-gray-500">
          {status.firmasCompletadas}/{status.totalFirmas} completadas
        </span>
      </div>

      {/* Lista de slots */}
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} />
        ))}
      </div>

      {/* Formulario de firma — solo si hay pendientes y no es solo lectura */}
      {!soloLectura && pendientes.length > 0 && !firmado && (
        <>
          <Separator className="border-blue-100" />

          <div className="space-y-2.5">
            <p className="text-xs font-medium text-gray-700">¿Cuál es tu rol?</p>

            {/* Chips de slots pendientes */}
            <div className="flex flex-wrap gap-1.5">
              {pendientes.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSlotSeleccionado(slotSeleccionado?.id === slot.id ? null : slot)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    slotSeleccionado?.id === slot.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {slot.rolNombre}
                  {!slot.esObligatorio && <span className="ml-1 opacity-60">(opcional)</span>}
                </button>
              ))}
            </div>

            {/* Observaciones */}
            {slotSeleccionado && (
              <textarea
                value={observaciones}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Observaciones (opcional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={handleFirmar}
              disabled={!slotSeleccionado || firmar.isPending}
            >
              {firmar.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PenLine className="h-3.5 w-3.5" />
              )}
              {firmar.isPending ? "Firmando..." : "Firmar como " + (slotSeleccionado?.rolNombre ?? "...")}
            </Button>

            {firmar.isError && (
              <p className="text-xs text-red-600">
                {(firmar.error as Error)?.message ?? "Error al firmar"}
              </p>
            )}
          </div>
        </>
      )}

      {/* Confirmación de éxito tras firmar */}
      {firmado && (
        <p className="text-xs text-green-700 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Firma registrada correctamente
        </p>
      )}
    </div>
  )
}

// ─── Fila individual de slot ──────────────────────────────────────────────────

function SlotRow({ slot }: { slot: RegistroFirmaSlot }) {
  const firmado = !!slot.firmaId

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1.5 min-w-0">
        {firmado ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        )}
        <span className={`font-medium truncate ${firmado ? "text-gray-700" : "text-gray-500"}`}>
          {slot.rolNombre}
        </span>
        {!slot.esObligatorio && (
          <span className="text-gray-400 shrink-0">(opcional)</span>
        )}
      </div>

      {firmado ? (
        <div className="text-right shrink-0">
          <span className="text-gray-600">{slot.nombreFirmante}</span>
          {slot.fechaFirma && (
            <span className="text-gray-400 ml-1.5">
              {new Date(slot.fechaFirma).toLocaleDateString("es-AR")}
            </span>
          )}
        </div>
      ) : (
        <span className="text-gray-400 shrink-0">Pendiente</span>
      )}
    </div>
  )
}
