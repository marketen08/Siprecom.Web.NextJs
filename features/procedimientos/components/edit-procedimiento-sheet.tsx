"use client"

import { useState } from "react"

import { useOpenProcedimiento } from "../hooks/use-open-procedimiento"
import { useGetProcedimiento } from "../api/use-get-procedimiento"
import { useUpdateProcedimiento } from "../api/use-update-procedimiento"
import { useUploadProcedimientoArchivo } from "../api/use-upload-procedimiento-archivo"
import { ProcedimientoForm } from "./procedimiento-form"
import type { ProcedimientoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditProcedimientoSheet() {
  const { id, isOpen, close } = useOpenProcedimiento()
  const { data, isLoading } = useGetProcedimiento(id)
  const mutation = useUpdateProcedimiento(id ?? "")
  const uploadMutation = useUploadProcedimientoArchivo()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const procedimiento = data?.data

  const onSubmit = async (values: ProcedimientoFormValues, archivo: File | null) => {
    if (!id) return
    setUploadError(null)
    try {
      // Paso 1: actualizar los campos de texto.
      await mutation.mutateAsync(values)
      // Paso 2: si el usuario adjuntó un archivo nuevo, lo subimos al endpoint dedicado.
      if (archivo) {
        await uploadMutation.mutateAsync({ id, file: archivo })
      }
      close()
    } catch (err) {
      // Si falla el upload el procedimiento ya quedó actualizado: mostramos error inline
      // y dejamos el sheet abierto para que el usuario reintente sin perder el archivo.
      setUploadError((err as Error).message ?? "Error al guardar")
    }
  }

  const isPending = mutation.isPending || uploadMutation.isPending

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar procedimiento</SheetTitle>
          <SheetDescription>
            Modificá los datos del procedimiento.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : procedimiento ? (
            <>
              <ProcedimientoForm
                defaultValues={procedimiento}
                onSubmit={onSubmit}
                isPending={isPending}
                onCancel={close}
              />
              {uploadError && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                  {uploadError}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el procedimiento.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
