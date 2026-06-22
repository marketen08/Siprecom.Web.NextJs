"use client"

import { useNewNivel } from "../hooks/use-new-nivel"
import { useCreateNivel } from "../api/use-create-nivel"
import { NivelForm } from "./nivel-form"
import type { NivelFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewNivelSheet() {
  const { isOpen, close } = useNewNivel()
  const mutation = useCreateNivel()

  const onSubmit = (values: NivelFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo nivel</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo nivel.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <NivelForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
