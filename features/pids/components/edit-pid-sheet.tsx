"use client"

import { useState } from "react"

import { useOpenPid } from "../hooks/use-open-pid"
import { useGetPid } from "../api/use-get-pids"
import { useUpdatePid, useReemplazarArchivoPid } from "../api/use-mutate-pids"
import { PidForm } from "./pid-form"
import type { PidArchivoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function EditPidSheet() {
  const { id, isOpen, close } = useOpenPid()
  const { data: resp, isLoading } = useGetPid(id ?? undefined)
  const pid = resp?.data

  const updateMutation = useUpdatePid(id ?? "")
  const reemplazarMutation = useReemplazarArchivoPid(id ?? "")

  const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null)

  const onSubmit = (values: PidArchivoFormValues) => {
    updateMutation.mutate(
      {
        codigo: values.codigo,
        nombre: values.nombre,
        descripcion: values.descripcion || "",
        subSistemaIds: values.subSistemaIds ?? [],
      },
      { onSuccess: close },
    )
  }

  const onReemplazar = () => {
    if (!nuevoArchivo) return
    reemplazarMutation.mutate(nuevoArchivo, {
      onSuccess: () => setNuevoArchivo(null),
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
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
                onCancel={close}
              />

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
                  onChange={(e) => setNuevoArchivo(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                {nuevoArchivo && (
                  <p className="text-xs text-muted-foreground">
                    Nuevo: {nuevoArchivo.name} — {(nuevoArchivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
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
