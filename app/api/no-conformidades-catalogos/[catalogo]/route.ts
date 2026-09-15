import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Catálogos del módulo: tipos (NC/SAC/SOM), estados y motivos.
const CATALOGOS = new Set(["tipos", "estados", "motivos"])

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades-catalogos/[catalogo]">,
) {
  const { catalogo } = await context.params
  if (!CATALOGOS.has(catalogo)) {
    return Response.json({ message: `Catálogo '${catalogo}' no existe.` }, { status: 404 })
  }
  const res = await backendFetch(request, `/no-conformidades-catalogos/${catalogo}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
