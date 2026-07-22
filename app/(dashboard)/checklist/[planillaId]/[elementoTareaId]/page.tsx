import { redirect } from "next/navigation"

// Redirect de retrocompatibilidad — la ruta canónica se movió a
// /ejecucion/registros/[planillaId]/[elementoTareaId] (Fase 1 de la migración).
// Mantenemos este redirect para que:
//   - Los QRs impresos con URL /checklist/... sigan funcionando.
//   - Los usuarios con el link viejo bookmarkeado no vean 404.
//   - La app WinForms local (que aún parsea "checklist" en el QR) no rompa.
// Cuando el generador de QR (backend) y el parser (frontend + WinForms) migren,
// este archivo se puede eliminar.
export default async function Page({
  params,
}: {
  params: Promise<{ planillaId: string; elementoTareaId: string }>
}) {
  const { planillaId, elementoTareaId } = await params
  redirect(`/ejecucion/registros/${planillaId}/${elementoTareaId}`)
}
