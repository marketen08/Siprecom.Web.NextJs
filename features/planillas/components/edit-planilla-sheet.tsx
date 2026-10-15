"use client"

import { useOpenPlanilla } from "../hooks/use-open-planilla"
import { useGetPlanilla } from "../api/use-get-planilla"
import { useUpdatePlanilla } from "../api/use-update-planilla"
import { PlanillaForm } from "./planilla-form"
import type { PlanillaFormValues } from "../schema"
import type { ApiError } from "@/lib/api-client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditPlanillaSheet() {
  const { id, isOpen, close } = useOpenPlanilla()
  const { data: planillaResult, isLoading } = useGetPlanilla(id)
  const planilla = (planillaResult as any)?.data ?? planillaResult
  const mutation = useUpdatePlanilla()

  const onSubmit = (values: PlanillaFormValues) => {
    mutation.mutate({ ...values, id: id! }, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar planilla</SheetTitle>
          <SheetDescription>
            Modificá los datos de la planilla.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : planilla ? (
            <>
              <PlanillaForm
                defaultValues={planilla}
                onSubmit={onSubmit}
                isPending={mutation.isPending}
                onCancel={close}
                serverErrors={(mutation.error as ApiError | null)?.body?.errors}
              />
              {mutation.isError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
                  {(mutation.error as Error)?.message ?? "Error al guardar la planilla."}
                </div>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
