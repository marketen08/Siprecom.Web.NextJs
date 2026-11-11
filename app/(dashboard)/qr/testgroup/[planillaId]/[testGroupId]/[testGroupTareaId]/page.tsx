import { redirect } from "next/navigation"

// Espejo del path corto /qr/... para test groups. Redirige a la ruta canónica
// /ejecucion/registros/testgroup/.... Ver /qr/[...ids]/page.tsx.
//
// El segmento estático "testgroup" tiene precedencia sobre el catch-all /qr/[...ids],
// así que los dos conviven: esta ruta se lleva /qr/testgroup/... y la otra el resto.
//
// Hoy NO hay nada en el backend que emita esta URL: buscando "/qr/" en
// Siprecom.Server.Api sólo aparece el QR de ElementoTarea. Queda por si hay papel
// viejo con este formato. Si alguna vez se vuelve a generar, acordarse de que tres
// ids sin comprimir dan un QR bastante más grande que el de versión 4 que se imprime
// hoy — y que el tamaño del módulo es justo lo que decide si el escáner lo puede leer.
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
