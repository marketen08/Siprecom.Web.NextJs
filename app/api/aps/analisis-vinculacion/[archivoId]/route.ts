import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/aps/analisis-vinculacion/[archivoId]
//
// Para los Elementos sin pieza: en qué property del modelo aparece su TAG.
// Es rápido — el backend cruza el índice que dejó el procesamiento contra los
// Elementos actuales, sin llamar a APS.
//
// Tipo de context sin RouteContext<> porque la ruta es nueva y los types
// generados por Next no la tienen todavía.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ archivoId: string }> },
) {
  const { archivoId } = await context.params
  const res = await backendFetch(request, `/aps/analisis-vinculacion/${archivoId}`, { method: "GET" })
  const data = await res.json().catch(() => ({ message: "Error analizando la vinculación" }))
  return Response.json(data, { status: res.status })
}
