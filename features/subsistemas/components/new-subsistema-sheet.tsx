"use client"

import { useNewSubSistema } from "../hooks/use-new-subsistema"
import { useCreateSubSistema } from "../api/use-create-subsistema"
import { SubSistemaForm } from "./subsistema-form"
import type { SubSistemaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewSubSistemaSheet() {
  const { isOpen, close } = useNewSubSistema()
  const mutation = useCreateSubSistema()

  const onSubmit = (values: SubSistemaFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo subsistema</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo subsistema.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <SubSistemaForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
