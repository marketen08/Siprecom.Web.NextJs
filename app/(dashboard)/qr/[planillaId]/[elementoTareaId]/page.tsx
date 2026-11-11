import { redirect } from "next/navigation"

import { expandirIdQr } from "@/features/registros/lib/qr-id"

// Path corto usado por los QRs generados en las planillas físicas — redirige a
// la ruta canónica /ejecucion/registros/et/[planillaId]/[elementoTareaId].
//
// Este path se creó para reducir el tamaño del QR (evitar saltar a V6 en tenants
// con dominios largos) y aislar el QR de futuros renames de la ruta canónica.
// Ver el generador de QR en Siprecom.Server.Api/Core/Helpers/QrCodigo.cs.
//
// Los ids llegan comprimidos a 22 caracteres en el papel impreso de ahora en
// adelante, y enteros en el que ya está en obra. `expandirIdQr` deja pasar el GUID
// sin tocarlo, así que los dos formatos entran por acá sin bifurcar nada. Esta
// ruta la abre el celular al apuntar la cámara al papel, y también el cliente
// desde la columna "URL del QR" del Excel de tareas.
export default async function Page({
  params,
}: {
  params: Promise<{ planillaId: string; elementoTareaId: string }>
}) {
  const { planillaId, elementoTareaId } = await params
  redirect(
    `/ejecucion/registros/et/${expandirIdQr(planillaId)}/${expandirIdQr(elementoTareaId)}`,
  )
}
