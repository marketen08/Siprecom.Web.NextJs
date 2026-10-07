import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Mismo equipo destino que el apply: si el preview resolviera en otro alcance, podría
  // aprobar un import que después choca.
  const equipoDestino = request.nextUrl.searchParams.get("equipoDestino")
  const path = equipoDestino
    ? `/planillas/import-all/preview?equipoDestino=${encodeURIComponent(equipoDestino)}`
    : "/planillas/import-all/preview"

  const res = await backendFetch(request, path, {
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
