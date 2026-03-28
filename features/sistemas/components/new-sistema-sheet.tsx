"use client"

import { useNewSistema } from "../hooks/use-new-sistema"
import { useCreateSistema } from "../api/use-create-sistema"
import { SistemaForm } from "./sistema-form"
import type { SistemaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewSistemaSheet() {
  const { isOpen, close } = useNewSistema()
  const mutation = useCreateSistema()

  const onSubmit = (values: SistemaFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo sistema</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo sistema.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <SistemaForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
