"use client"

import { useOpenTestGroup } from "../hooks/use-open-testgroup"
import { useGetTestGroup } from "../api/use-get-testgroup"
import { useUpdateTestGroup } from "../api/use-update-testgroup"
import { TestGroupForm } from "./testgroup-form"
import type { TestGroupUpdateFormValues } from "../schema"

import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

export function EditTestGroupSheet() {
  const { id, isOpen, close } = useOpenTestGroup()
  const { data, isLoading } = useGetTestGroup(id)
  const mutation = useUpdateTestGroup(id ?? "")

  const tg = data?.data

  const onSubmit = (values: TestGroupUpdateFormValues) => {
    mutation.mutate(values as any, { onSuccess: close })
  }

  const handleClose = () => {
    mutation.reset()
    close()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar paquete de prueba</SheetTitle>
          <SheetDescription>Modificá los datos del paquete. El tipo no se puede cambiar.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : tg ? (
            <TestGroupForm
              mode="edit"
              defaultValues={tg}
              onSubmit={onSubmit as any}
              isPending={mutation.isPending}
              onCancel={handleClose}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el paquete.</p>
          )}
          {mutation.error && (
            <p className="text-sm text-destructive mt-3 whitespace-pre-line">
              {(mutation.error as Error).message}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
