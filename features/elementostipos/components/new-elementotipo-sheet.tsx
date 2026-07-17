"use client"

import { useNewElementoTipo } from "../hooks/use-new-elementotipo"
import { useCreateElementoTipo } from "../api/use-create-elementotipo"
import { ElementoTipoForm } from "./elementotipo-form"
import type { ElementoTipoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewElementoTipoSheet() {
  const { isOpen, close } = useNewElementoTipo()
  const mutation = useCreateElementoTipo()

  const onSubmit = (values: ElementoTipoFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo tipo de elemento</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo tipo de elemento.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <ElementoTipoForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
