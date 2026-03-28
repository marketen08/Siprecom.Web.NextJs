"use client"

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

  const procedimiento = data?.data

  const onSubmit = (values: ProcedimientoFormValues) => {
    mutation.mutate(values, { onSuccess: close })
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
            <ProcedimientoForm
              defaultValues={procedimiento}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el procedimiento.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
