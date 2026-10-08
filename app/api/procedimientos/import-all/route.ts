import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const modo = request.nextUrl.searchParams.get("modo") ?? "omitir"
  // Equipo destino: los procedimientos que en el origen eran de un equipo aterrizan acá. Lo
  // que era global queda global, pero sólo si lo trae un AdminGlobal.
  const equipoDestino = request.nextUrl.searchParams.get("equipoDestino")

  const qs = new URLSearchParams({ modo })
  if (equipoDestino) qs.set("equipoDestino", equipoDestino)

  const res = await backendFetch(request, `/procedimientos/import-all?${qs}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
