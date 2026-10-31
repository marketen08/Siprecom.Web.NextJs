import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/reportes/listado-pendientes/excel — punch list horizontal en .xlsx.
// Mismos filtros que el PDF vertical; los dos formatos conviven.
//
// `ambitoId` queda deliberadamente AFUERA, igual que en el proxy del PDF: sin él
// el backend usa sólo el ámbito principal. Si se reenviara, cualquiera podría
// pedir un ámbito restringido armando la URL a mano — el reporte lo filtra por id
// pero no verifica la audiencia del ámbito.
const PARAMS = [
  "sistemaId", "subSistemaId", "categoriaId", "tipoId",
  "estadoId", "responsableId", "prioridad", "soloAbiertos",
] as const

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const key of PARAMS) {
    const v = sp.get(key)
    if (v) qs.set(key, v)
  }
  const path = qs.toString()
    ? `/reportes/listado-pendientes/excel?${qs.toString()}`
    : "/reportes/listado-pendientes/excel"

  const res = await backendFetch(request, path)
  if (!res.ok) {
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "text/plain" },
    })
  }

  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `attachment; filename="punch-list.xlsx"`,
    },
  })
}
