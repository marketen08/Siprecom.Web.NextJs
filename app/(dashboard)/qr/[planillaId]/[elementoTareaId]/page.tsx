import { redirect } from "next/navigation"

// Path corto usado por los QRs generados en las planillas físicas — redirige a
// la ruta canónica /ejecucion/registros/[planillaId]/[elementoTareaId].
//
// Este path se creó para reducir el tamaño del QR (evitar saltar a V6 en tenants
// con dominios largos) y aislar el QR de futuros renames de la ruta canónica.
// Ver el generador de QR en Siprecom.Server.Api/Core/Services/PdfGeneratorService.cs.
export default async function Page({
  params,
}: {
  params: Promise<{ planillaId: string; elementoTareaId: string }>
}) {
  const { planillaId, elementoTareaId } = await params
  redirect(`/ejecucion/registros/${planillaId}/${elementoTareaId}`)
}
