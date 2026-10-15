"use client"

import { useOpenArea } from "../hooks/use-open-area"
import { useGetArea } from "../api/use-get-area"
import { useUpdateArea } from "../api/use-update-area"
import { AreaForm } from "./area-form"
import type { AreaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditAreaSheet() {
  const { id, isOpen, close } = useOpenArea()
  const { data, isLoading } = useGetArea(id)
  const mutation = useUpdateArea(id ?? "")

  const area = data?.data

  const onSubmit = (values: AreaFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar área</SheetTitle>
          <SheetDescription>Modificá los datos del área.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : area ? (
            <AreaForm
              defaultValues={area}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el área.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
