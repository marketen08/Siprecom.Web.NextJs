"use client"

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

  const onSubmit = (values: ProcedimientoFormValues) => {
    mutation.mutate(values, { onSuccess: close })
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
        </div>
      </SheetContent>
    </Sheet>
  )
}
