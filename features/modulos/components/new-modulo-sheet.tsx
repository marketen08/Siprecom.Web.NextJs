"use client"

import { useNewModulo } from "../hooks/use-new-modulo"
import { useCreateModulo } from "../api/use-create-modulo"
import { ModuloForm } from "./modulo-form"
import type { ModuloFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewModuloSheet() {
  const { isOpen, close } = useNewModulo()
  const mutation = useCreateModulo()

  const onSubmit = (values: ModuloFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo módulo</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo módulo del proyecto.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <ModuloForm onSubmit={onSubmit} isPending={mutation.isPending} onCancel={close} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
