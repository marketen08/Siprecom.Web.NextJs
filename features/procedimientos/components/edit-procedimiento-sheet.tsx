"use client"

import { useState } from "react"

import { useOpenProcedimiento } from "../hooks/use-open-procedimiento"
import { useGetProcedimiento } from "../api/use-get-procedimiento"
import { useUpdateProcedimiento } from "../api/use-update-procedimiento"
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  const procedimiento = data?.data

  const onSubmit = async (values: ProcedimientoFormValues, archivo: File | null) => {
    if (!id) return
    setSubmitError(null)
    try {
      // Una sola request multipart. Si archivo es null, el backend conserva el PDF actual.
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
                isPending={mutation.isPending}
                onCancel={close}
              />
              {submitError && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 rounded px-2 py-1 whitespace-pre-wrap">
                  {submitError}
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
