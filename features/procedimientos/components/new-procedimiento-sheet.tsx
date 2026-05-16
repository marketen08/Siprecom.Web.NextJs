"use client"

import { useState } from "react"

import { useNewProcedimiento } from "../hooks/use-new-procedimiento"
import { useCreateProcedimiento } from "../api/use-create-procedimiento"
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  const onSubmit = async (values: ProcedimientoFormValues, archivo: File | null) => {
    setSubmitError(null)
    try {
      // Una sola request multipart: texto + PDF (si hay) viajan juntos.
      // Si la validación del archivo falla, el procedimiento no se crea (atomic).
      await mutation.mutateAsync({
        nombre: values.nombre,
        observaciones: values.observaciones,
        archivo,
      })
      close()
    } catch (err) {
      setSubmitError((err as Error).message ?? "Error al guardar")
    }
  }

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
            isPending={mutation.isPending}
            onCancel={close}
          />
          {submitError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 rounded px-2 py-1 whitespace-pre-wrap">
              {submitError}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
