"use client"

import { useRouter } from "next/navigation"

import { useNewPlanilla } from "../hooks/use-new-planilla"
import { useCreatePlanilla } from "../api/use-create-planilla"
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

export function NewPlanillaSheet() {
  const { isOpen, close } = useNewPlanilla()
  const mutation = useCreatePlanilla()
  const router = useRouter()

  const onSubmit = (values: PlanillaFormValues) => {
    mutation.mutate(values, {
      onSuccess: (res: unknown) => {
        close()
        // Tras crear, ir directo a la configuración de la planilla nueva.
        // El envelope puede venir como { data: PlanillaDTO } o el DTO directo.
        const r = res as { data?: { id?: string }; id?: string }
        const id = r?.data?.id ?? r?.id
        if (id) router.push(`/configuracion/planillas/${id}`)
      },
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva planilla</SheetTitle>
          <SheetDescription>
            Completá los datos para crear una nueva planilla.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <PlanillaForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
            serverErrors={(mutation.error as ApiError | null)?.body?.errors}
          />
          {/* Mensaje general del error. Los de validación por field ya salen inline
              dentro del form; esto cubre el resto (500, red, etc.) para que crear
              nunca falle en silencio. */}
          {mutation.isError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
              {(mutation.error as Error)?.message ?? "Error al crear la planilla."}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
