import { redirect } from "next/navigation"

// Redirect de retrocompatibilidad — espejo de testgroup movido a
// /ejecucion/registros/testgroup/[planillaId]/[testGroupId]/[testGroupTareaId]
// (Fase 1 de la migración). Ver comentario en /checklist/[planillaId]/[etId]/page.tsx.
export default async function Page({
  params,
}: {
  params: Promise<{
    planillaId: string
    testGroupId: string
    testGroupTareaId: string
  }>
}) {
  const { planillaId, testGroupId, testGroupTareaId } = await params
  redirect(
    `/ejecucion/registros/testgroup/${planillaId}/${testGroupId}/${testGroupTareaId}`,
  )
}
