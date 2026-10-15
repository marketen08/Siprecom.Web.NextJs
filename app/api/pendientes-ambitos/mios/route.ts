import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

/**
 * Ámbitos en los que el usuario puede clasificar un pendiente. Alimenta el selector
 * del alta y el de reclasificación — es el mismo predicado en las dos pantallas.
 */
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/pendientes-ambitos/mios")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
