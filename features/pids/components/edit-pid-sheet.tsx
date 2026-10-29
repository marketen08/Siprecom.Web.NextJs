"use client"

import { useEffect, useState } from "react"

import { useOpenPid } from "../hooks/use-open-pid"
import { useGetPid } from "../api/use-get-pids"
import {
  useUpdatePid,
  useReemplazarArchivoPid,
  useRotarPid,
  fetchPidDownloadUrl,
  type RotacionGrados,
} from "../api/use-mutate-pids"
import { PidForm } from "./pid-form"
import { PidPreviewRotacion } from "./pid-preview-rotacion"
import type { PidArchivoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

export function EditPidSheet() {
  const { id, isOpen, close } = useOpenPid()
  const { data: resp, isLoading } = useGetPid(id ?? undefined)
  const pid = resp?.data

  const updateMutation = useUpdatePid(id ?? "")
  const reemplazarMutation = useReemplazarArchivoPid(id ?? "")

  const rotarMutation = useRotarPid(id ?? "")

  const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null)
  /** Rotación a aplicar al archivo nuevo, si se está reemplazando. */
  const [rotacionNuevo, setRotacionNuevo] = useState<RotacionGrados>(0)

  // ── Rotar el PDF que ya está guardado ───────────────────────────────────
  // El preview se arma sobre el PDF del servidor, así que necesitamos su SAS.
  // `recarga` se incrementa después de rotar para volver a pedirla: el blob
  // cambió y la URL anterior apunta a un archivo que ya no existe.
  const [urlActual, setUrlActual] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  /** Rotación elegida en el preview, todavía sin aplicar. */
  const [rotacionPendiente, setRotacionPendiente] = useState<RotacionGrados>(0)

  useEffect(() => {
    if (!id || !isOpen) return
    let vigente = true
    fetchPidDownloadUrl(id)
      .then(({ url }) => { if (vigente) setUrlActual(url) })
      .catch(() => { /* sin SAS no hay preview; el resto del sheet funciona */ })
    return () => { vigente = false }
  }, [id, isOpen, recarga])

  /** Cerrar limpiando lo que haya quedado a medio elegir. */
  const cerrar = () => {
    setRotacionPendiente(0)
    setRotacionNuevo(0)
    setNuevoArchivo(null)
    setUrlActual(null)
    close()
  }

  const onSubmit = (values: PidArchivoFormValues) => {
    updateMutation.mutate(
      {
        codigo: values.codigo,
        nombre: values.nombre,
        descripcion: values.descripcion || "",
        subSistemaIds: values.subSistemaIds ?? [],
      },
      { onSuccess: cerrar },
    )
  }

  const onReemplazar = () => {
    if (!nuevoArchivo) return
    reemplazarMutation.mutate(
      { archivo: nuevoArchivo, rotacionGrados: rotacionNuevo },
      {
        onSuccess: () => {
          setNuevoArchivo(null)
          setRotacionNuevo(0)
          // El archivo cambió: el preview de "orientación" debe rehacerse.
          setRecarga((n) => n + 1)
        },
      },
    )
  }

  const onAplicarRotacion = async () => {
    if (rotacionPendiente === 0) return
    await rotarMutation.mutateAsync(rotacionPendiente)
    setRotacionPendiente(0)
    setRecarga((n) => n + 1)
  }

  return (
    <Sheet open={isOpen} onOpenChange={cerrar}>
      <SheetContent className="w-full sm:max-w-lg! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar PID</SheetTitle>
          <SheetDescription>
            Actualizá los datos del PID o reemplazá el archivo por una revisión nueva.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6 flex flex-col gap-6">
          {isLoading || !pid ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <PidForm
                requireArchivo={false}
                defaultValues={pid}
                onSubmit={(values) => onSubmit(values)}
                isPending={updateMutation.isPending}
                onCancel={cerrar}
              />

              {/* Orientación del plano guardado. Rotar reescribe el PDF y mueve
                  con él los pines, así que se confirma antes de aplicar. */}
              <div className="border-t pt-4 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Orientación del plano
                </p>
                {urlActual ? (
                  <>
                    <PidPreviewRotacion
                      key={urlActual}
                      fuente={urlActual}
                      rotacion={rotacionPendiente}
                      onRotacionChange={setRotacionPendiente}
                      disabled={rotarMutation.isPending}
                      leyenda={
                        rotacionPendiente === 0
                          ? "Si el plano está acostado, giralo y aplicá el cambio."
                          : `Pendiente de aplicar: ${rotacionPendiente}°.`
                      }
                    />
                    {rotacionPendiente !== 0 && (
                      <ConfirmActionDialog
                        trigger={
                          <span>
                            {rotarMutation.isPending
                              ? "Aplicando…"
                              : `Aplicar rotación de ${rotacionPendiente}°`}
                          </span>
                        }
                        triggerClassName="inline-flex w-fit items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                        title={`¿Rotar el plano ${rotacionPendiente}°?`}
                        description={
                          <>
                            Se reescribe el PDF, así que el plano queda derecho también
                            al descargarlo o imprimirlo.
                            {pid.cantidadPendientes > 0 && (
                              <>
                                {" "}Los <strong>{pid.cantidadPendientes}</strong> pendientes
                                con pin en este PID se giran junto con el plano, de modo que
                                siguen señalando el mismo punto.
                              </>
                            )}
                          </>
                        }
                        confirmText="Rotar"
                        pendingText="Rotando..."
                        onConfirm={onAplicarRotacion}
                      />
                    )}
                    {rotarMutation.error && (
                      <p className="text-sm text-destructive whitespace-pre-line">
                        {(rotarMutation.error as Error).message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Cargando previsualización…</p>
                )}
              </div>

              <div className="border-t pt-4 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reemplazar archivo
                </p>
                <p className="text-xs text-muted-foreground">
                  Archivo actual: <strong>{pid.nombreArchivo}</strong> · {pid.pageCount} páginas
                </p>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={reemplazarMutation.isPending}
                  onChange={(e) => {
                    setNuevoArchivo(e.target.files?.[0] ?? null)
                    setRotacionNuevo(0)
                  }}
                  className="text-sm"
                />
                {nuevoArchivo && (
                  <p className="text-xs text-muted-foreground">
                    Nuevo: {nuevoArchivo.name} — {(nuevoArchivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                {nuevoArchivo && (
                  <PidPreviewRotacion
                    key={`nuevo-${nuevoArchivo.name}-${nuevoArchivo.size}-${nuevoArchivo.lastModified}`}
                    fuente={nuevoArchivo}
                    rotacion={rotacionNuevo}
                    onRotacionChange={setRotacionNuevo}
                    disabled={reemplazarMutation.isPending}
                    leyenda={
                      rotacionNuevo !== 0
                        ? `Se va a guardar girado ${rotacionNuevo}°.`
                        : "Si el plano está acostado, giralo antes de reemplazar."
                    }
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onReemplazar}
                  disabled={!nuevoArchivo || reemplazarMutation.isPending}
                  className="w-fit"
                >
                  {reemplazarMutation.isPending ? "Subiendo…" : "Reemplazar PDF"}
                </Button>
                {reemplazarMutation.error && (
                  <p className="text-sm text-destructive whitespace-pre-line">
                    {(reemplazarMutation.error as Error).message}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
