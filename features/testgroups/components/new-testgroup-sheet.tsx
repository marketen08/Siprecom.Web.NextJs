"use client"

import { useNewTestGroup } from "../hooks/use-new-testgroup"
import { useCreateTestGroup } from "../api/use-create-testgroup"
import { TestGroupForm } from "./testgroup-form"
import type { TestGroupCreateFormValues } from "../schema"

import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

export function NewTestGroupSheet() {
  const { isOpen, close } = useNewTestGroup()
  const mutation = useCreateTestGroup()

  const onSubmit = (values: TestGroupCreateFormValues) => {
    mutation.mutate(values as any, { onSuccess: close })
  }

  // Al cerrar el sheet limpiamos el error anterior — evita que reaparezca
  // al abrirlo de nuevo para crear otro pack.
  const handleClose = () => {
    mutation.reset()
    close()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo Test Pack</SheetTitle>
          <SheetDescription>
            Elegí el tipo sintético del pack y completá los datos.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isOpen && (
            <TestGroupForm
              mode="create"
              onSubmit={onSubmit as any}
              isPending={mutation.isPending}
              onCancel={handleClose}
            />
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
