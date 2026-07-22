import { redirect } from "next/navigation"

// Espejo del path corto /qr/... para test groups. Redirige a la ruta canónica
// /ejecucion/registros/testgroup/.... Ver comentario en /qr/[planillaId]/[etId]/page.tsx.
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
