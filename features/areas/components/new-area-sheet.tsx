"use client"

import { useNewArea } from "../hooks/use-new-area"
import { useCreateArea } from "../api/use-create-area"
import { AreaForm } from "./area-form"
import type { AreaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewAreaSheet() {
  const { isOpen, close } = useNewArea()
  const mutation = useCreateArea()

  const onSubmit = (values: AreaFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva área</SheetTitle>
          <SheetDescription>
            Completá los datos para crear una nueva área del proyecto.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <AreaForm onSubmit={onSubmit} isPending={mutation.isPending} onCancel={close} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
