import { notFound, redirect } from "next/navigation"

import { expandirIdQr } from "@/features/registros/lib/qr-id"

// Path corto que llevan adentro los QRs de las planillas físicas. Redirige a la
// ruta canónica /ejecucion/registros/et/...
//
// Existe para que el QR sea chico: cuanto más corto el contenido, menos módulos
// tiene el código y más grande queda cada módulo sobre el papel, que es lo único
// que decide si el escáner lo puede leer. Ver Core/Helpers/QrCodigo.cs en el
// backend, que es donde se arma el contenido y donde está la medición.
//
// Es catch-all porque tiene que aceptar los dos largos que existen en papel:
//
//   /qr/{elementoTareaId}                ← lo que se imprime hoy
//   /qr/{planillaId}/{elementoTareaId}   ← papel anterior, con y sin comprimir
//
// Del segundo sólo interesa el ÚLTIMO segmento: la planilla se deduce de la
// ElementoTarea, así que el primero se descarta en vez de arrastrarlo.
//
// Los ids vienen comprimidos a 22 caracteres en el papel reciente y enteros en el
// viejo; `expandirIdQr` deja pasar el GUID sin tocarlo, así que no hay que
// bifurcar. Esta ruta la abre el celular al apuntar la cámara al papel, y también
// el cliente desde la columna "URL del QR" del Excel de tareas.
export default async function Page({ params }: PageProps<"/qr/[...ids]">) {
  const { ids } = await params

  // 1 o 2 segmentos. Más que eso no es un QR nuestro.
  if (!ids || ids.length === 0 || ids.length > 2) notFound()

  const elementoTareaId = expandirIdQr(ids[ids.length - 1])
  redirect(`/ejecucion/registros/et/${elementoTareaId}`)
}
