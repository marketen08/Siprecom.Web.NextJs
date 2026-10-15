import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/certificados/estado${search}`)
  // El backend puede devolver body vacío en errores no manejados (ej. tabla que
  // no existe todavía porque falta correr la migración). Manejamos ese caso
  // para no propagar "Unexpected end of JSON input" al cliente.
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!text || !ct.includes("application/json")) {
    return Response.json(
      {
        message: `Backend devolvió ${res.status} sin JSON. Posible causa: falta correr la migración EF (tabla SubsistemaCertificados no existe). Detalle: ${text.slice(0, 200) || "(body vacío)"}`,
      },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
