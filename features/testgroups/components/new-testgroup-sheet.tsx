"use client"

import { useNewTestGroup } from "../hooks/use-new-testgroup"
import { useCreateTestGroup } from "../api/use-create-testgroup"
import { TestGroupForm } from "./testgroup-form"
import type { TestGroupCreateFormValues } from "../schema"

import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { TIPO_TEST_GROUP } from "../types"

export function NewTestGroupSheet() {
  const { isOpen, tipo, close } = useNewTestGroup()
  const mutation = useCreateTestGroup()

  const onSubmit = (values: TestGroupCreateFormValues) => {
    // enum types en el input son estrechos (MetodoPrueba, TipoPruebaFuncional);
    // el schema usa number.nullable() por practicidad. Cast al enviar.
    mutation.mutate(values as any, { onSuccess: close })
  }

  const tipoResolved = tipo ?? TIPO_TEST_GROUP.PRESSURE
  const titulo = tipoResolved === TIPO_TEST_GROUP.PRESSURE ? "Nuevo Pressure Test Pack" : "Nueva Basic Function"

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>Completá los datos del nuevo paquete.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isOpen && tipo != null && (
            <TestGroupForm
              mode="create"
              tipo={tipoResolved}
              onSubmit={onSubmit as any}
              isPending={mutation.isPending}
              onCancel={close}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
