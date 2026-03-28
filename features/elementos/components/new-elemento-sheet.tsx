"use client"

import { useNewElemento } from "../hooks/use-new-elemento"
import { useCreateElemento } from "../api/use-create-elemento"
import { ElementoForm } from "./elemento-form"
import type { ElementoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewElementoSheet() {
  const { isOpen, close } = useNewElemento()
  const mutation = useCreateElemento()

  const onSubmit = (values: ElementoFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo elemento</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo elemento.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <ElementoForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
