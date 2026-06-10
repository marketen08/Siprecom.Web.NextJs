import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/aps/codificaciones/[archivoId]
// Analiza el NWD traducido y devuelve las codificaciones de TAG (formas de
// Item.Name). Puede tardar — el backend re-descarga properties desde APS.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/aps/codificaciones/[archivoId]">,
) {
  const { archivoId } = await context.params
  const res = await backendFetch(request, `/aps/codificaciones/${archivoId}`, { method: "GET" })
  const data = await res.json().catch(() => ({ message: "Error analizando codificaciones" }))
  return Response.json(data, { status: res.status })
}
