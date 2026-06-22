"use client"

import { useOpenNivel } from "../hooks/use-open-nivel"
import { useGetNivel } from "../api/use-get-nivel"
import { useUpdateNivel } from "../api/use-update-nivel"
import { NivelForm } from "./nivel-form"
import type { NivelFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditNivelSheet() {
  const { id, isOpen, close } = useOpenNivel()
  const { data, isLoading } = useGetNivel(id)
  const mutation = useUpdateNivel(id ?? "")

  const nivel = data?.data

  const onSubmit = (values: NivelFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar nivel</SheetTitle>
          <SheetDescription>
            Modificá los datos del nivel.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : nivel ? (
            <NivelForm
              defaultValues={nivel}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el nivel.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
