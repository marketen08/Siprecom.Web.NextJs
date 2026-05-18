"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Clock, Loader2, PenLine, Lock } from "lucide-react"
import { useGetFirmasStatus } from "@/features/registros/api/use-get-firmas-status"
import { useFirmarRegistro } from "@/features/registros/api/use-firmar-registro"
import { useGetMiFirma, useUploadMiFirma } from "@/features/usuarios/api/use-mi-firma"
import { IntegridadBadge } from "@/features/registros/components/integridad-badge"
import type { RegistroFirmaSlot } from "@/features/registros/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SignaturePad, type SignaturePadHandle } from "@/components/ui/signature-pad"

interface Props {
  registroId: string
  /** Si se pasa, solo se muestran las firmas (sin el formulario) */
  soloLectura?: boolean
}

export function FirmaPanel({ registroId, soloLectura = false }: Props) {
  const { data, isLoading, isError } = useGetFirmasStatus(registroId)
  const firmar = useFirmarRegistro(registroId)
  const miFirmaQuery = useGetMiFirma(!soloLectura)
  const uploadMiFirma = useUploadMiFirma()

  const [slotSeleccionado, setSlotSeleccionado] = useState<RegistroFirmaSlot | null>(null)
  const [observaciones, setObs] = useState("")
  const [firmado, setFirmado] = useState(false)
  // Modo de captura: "guardada" = usar la firma del perfil; "dibujar" = pad en pantalla.
  const [modoFirma, setModoFirma] = useState<"guardada" | "dibujar">("guardada")
  const [guardarPerfil, setGuardarPerfil] = useState(false)
  const [padIsEmpty, setPadIsEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle | null>(null)

  const firmaGuardadaUrl = miFirmaQuery.data?.data?.url ?? null
  // Si no tiene firma guardada, forzamos modo "dibujar".
  const modoEfectivo = firmaGuardadaUrl ? modoFirma : "dibujar"

  const status = data?.data
  const slots = status?.slots ?? []
  const pendientes = slots.filter((s) => !s.firmaId)
  // Solo los slots que el usuario actual puede firmar
  const pendientesPropios = pendientes.filter((s) => s.puedeFirearUsuarioActual)
  // Hay restricción activa si algún slot pendiente tiene puedeFirearUsuarioActual=false
  const hayRestriccion = pendientes.some((s) => !s.puedeFirearUsuarioActual)

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

    // Resolver firma según el modo: el "guardada" lo resuelve el backend desde el perfil
    // (evita CORS browser→Azure). El "dibujar" sí manda dataURL.
    let datosFirma: string | null = null
    let usarFirmaGuardada = false
    if (modoEfectivo === "guardada" && firmaGuardadaUrl) {
      usarFirmaGuardada = true
    } else if (modoEfectivo === "dibujar") {
      datosFirma = padRef.current?.getDataUrl() ?? null
      if (!datosFirma) return
      if (guardarPerfil) {
        try { await uploadMiFirma.mutateAsync(datosFirma) } catch { /* ignore */ }
      }
    }

    await firmar.mutateAsync({
      rolFirmante: slotSeleccionado.rolNombre,
      observaciones: observaciones || undefined,
      datosFirma,
      usarFirmaGuardada,
    })
    setFirmado(true)
    setSlotSeleccionado(null)
    setObs("")
    setGuardarPerfil(false)
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">

      {/* Título */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
          <PenLine className="h-3.5 w-3.5" />
          Firmas digitales
        </span>
        <div className="flex items-center gap-2">
          {/* Badge de integridad criptográfica: visible cuando hay al menos
              una firma completada. Solo carga si el user es Admin/Supervisor
              (sino el backend retorna 403 y el badge se renderiza vacío). */}
          <IntegridadBadge
            registroId={registroId}
            enabled={status.firmasCompletadas > 0}
          />
          <span className="text-xs text-gray-500">
            {status.firmasCompletadas}/{status.totalFirmas} completadas
          </span>
        </div>
      </div>

      {/* Lista de slots */}
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} />
        ))}
      </div>

      {/* Mensaje cuando el usuario no tiene ningún rol asignado y hay restricción activa */}
      {!soloLectura && pendientes.length > 0 && pendientesPropios.length === 0 && hayRestriccion && !firmado && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          No tenés un rol de firma asignado para este proyecto. Contactá al administrador.
        </div>
      )}

      {/* Formulario de firma — solo si el usuario tiene slots asignados y no es solo lectura */}
      {!soloLectura && pendientesPropios.length > 0 && !firmado && (
        <>
          <Separator className="border-blue-100" />

          <div className="space-y-2.5">
            <p className="text-xs font-medium text-gray-700">Firmar como:</p>

            {/* Chips de slots pendientes del usuario */}
            <div className="flex flex-wrap gap-1.5">
              {pendientesPropios.map((slot) => (
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

            {/* Captura de firma — visible cuando seleccionó un slot */}
            {slotSeleccionado && (
              <>
                {/* Toggle entre firma guardada y dibujar (sólo si tiene firma guardada) */}
                {firmaGuardadaUrl && (
                  <div className="flex gap-1 p-0.5 bg-white border rounded-md w-fit">
                    <button
                      type="button"
                      onClick={() => setModoFirma("guardada")}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        modoEfectivo === "guardada" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Mi firma guardada
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoFirma("dibujar")}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        modoEfectivo === "dibujar" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Dibujar nueva
                    </button>
                  </div>
                )}

                {/* Preview de firma guardada */}
                {modoEfectivo === "guardada" && firmaGuardadaUrl && (
                  <div className="rounded-md border bg-white p-2 max-w-xs">
                    <img
                      src={firmaGuardadaUrl}
                      alt="Tu firma"
                      className="max-h-24 max-w-full object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Pad para dibujar */}
                {modoEfectivo === "dibujar" && (
                  <div className="space-y-1.5">
                    <SignaturePad
                      ref={padRef}
                      height={140}
                      onChange={(empty) => setPadIsEmpty(empty)}
                    />
                    {!firmaGuardadaUrl && (
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300"
                          checked={guardarPerfil}
                          onChange={(e) => setGuardarPerfil(e.target.checked)}
                        />
                        Guardar esta firma en mi perfil para próximas veces
                      </label>
                    )}
                  </div>
                )}

                <textarea
                  value={observaciones}
                  onChange={(e) => setObs(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Observaciones (opcional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}

            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={handleFirmar}
              disabled={
                !slotSeleccionado
                || firmar.isPending
                || uploadMiFirma.isPending
                || (modoEfectivo === "dibujar" && padIsEmpty)
              }
            >
              {firmar.isPending || uploadMiFirma.isPending ? (
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
