"use client"

import { Suspense, use } from "react"

import { AsignacionPageContent } from "@/app/(dashboard)/alcance/test-groups/asignacion/page"

/**
 * Ruta anidada: el pack ya viene fijado en la URL. Reusa el componente de
 * asignación pero pasando el id de ruta como pre-selección — así el breadcrumb
 * y el select interno arrancan con el pack correcto.
 */
export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <Suspense>
      <AsignacionPageContent preSelectedTestGroupId={id} />
    </Suspense>
  )
}
