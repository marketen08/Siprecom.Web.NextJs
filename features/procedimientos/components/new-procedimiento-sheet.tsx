"use client"

import { useState } from "react"

import { useNewProcedimiento } from "../hooks/use-new-procedimiento"
import { useCreateProcedimiento } from "../api/use-create-procedimiento"
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

export function NewProcedimientoSheet() {
  const { isOpen, close } = useNewProcedimiento()
  const mutation = useCreateProcedimiento()
  const uploadMutation = useUploadProcedimientoArchivo()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onSubmit = async (values: ProcedimientoFormValues, archivo: File | null) => {
    setUploadError(null)
    try {
      // Paso 1: crear el procedimiento y obtener el ID.
      const result = await mutation.mutateAsync(values)
      const created = (result as any)?.data ?? result
      const newId: string | undefined = created?.id

      // Paso 2: si el usuario adjuntó un archivo, lo subimos al endpoint dedicado.
      if (archivo && newId) {
        await uploadMutation.mutateAsync({ id: newId, file: archivo })
      }
      close()
    } catch (err) {
      setUploadError((err as Error).message ?? "Error al guardar")
    }
  }

  const isPending = mutation.isPending || uploadMutation.isPending

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo procedimiento</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo procedimiento.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <ProcedimientoForm
            onSubmit={onSubmit}
            isPending={isPending}
            onCancel={close}
          />
          {uploadError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
              {uploadError}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
