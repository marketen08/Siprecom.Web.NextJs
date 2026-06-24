"use client"

import { useRouter } from "next/navigation"

import { useNewPlanilla } from "../hooks/use-new-planilla"
import { useCreatePlanilla } from "../api/use-create-planilla"
import { PlanillaForm } from "./planilla-form"
import type { PlanillaFormValues } from "../schema"

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
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
