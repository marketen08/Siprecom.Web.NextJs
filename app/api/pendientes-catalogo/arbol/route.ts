import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/pendientes-catalogo/arbol → árbol de combinaciones válidas del
// catálogo para cascada estricta en el form del pendiente. Global, cacheado
// en el frontend con staleTime largo (invalida al mutar el catálogo).
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/pendientes-catalogo/arbol")
  const data = await res.json().catch(() => null)
  return Response.json(data, { status: res.status })
}
